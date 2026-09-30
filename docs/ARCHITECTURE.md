# Architecture

This is the normative specification: the API contract, data model, types, traits and every behavioural detail. The reader-friendly guide to the same material starts at [`docs/README.md`](README.md).

## Principles

- The backend is the source of truth. Users, meetings, transcripts, summaries, settings and prompts live on the server. The app is a thin client: audio, hotkeys, overlay, display.
- Two parts, one contract. The app and the backend talk only through the API described below. Providers are known only to the backend.
- Postgres for what must survive everything. Redis for what is read on every request during a live meeting, and for short-lived codes.
- The app core does not know about Tauri. `desktop/crates/core` compiles and is tested without a UI and without macOS.
- Everything platform-specific or external hides behind an interface. The composition root picks the implementation.
- A file does one thing and stays under roughly 200 lines. A module grows by splitting, not by getting longer.

## Repository layout

```
docker-compose.yml             Postgres, Redis for development
docker-compose.prod.yml        production: postgres, redis, migrate, backend

backend/prisma/                schema.prisma, migrations
backend/src
  main.ts, app.module.ts
  common/
    config/        env.schema.ts with zod, validateEnv
    decorators/    Public, GetCurrentUserId, GetCurrentUser, GetRefreshSession
    dto/           shared response classes
    filters/       global exception filter
    guards/        AtGuard, RtGuard, GoogleGuard, SubscriptionGuard
    middleware/    RequestIdMiddleware
    sse/           SseWriter
    untrusted/     fences for third-party text in prompts
    types/         express.d.ts, auth types
  infrastructure/
    prisma/        PrismaService on @prisma/adapter-pg, @Global
    redis/         RedisService on ioredis, @Global
    hashing/       HashingService on argon2
    llm/           LlmProvider, OpenAiLlmProvider
    stt/           SttProvider, DeepgramSttProvider
    storage/       ObjectStorage, R2ObjectStorage
  modules/
    auth/          email and password, JWT, Google, one-time code for the app
    user/          profile
    settings/      style, default language and profile
    projects/      groups of meetings
    resources/     materials on three levels, text extraction, context brief
    meetings/      meetings, MeetingStateStore over Redis, overview
    stt/           WebSocket gateway
    context/       ContextWindow, Summarizer
    generation/    SSE generation, PromptBuilder, prompts
    chat/          chats about a finished meeting, ChatAgent and its tools
    usage/         UsageRecorder
    health/

desktop/crates/core/src
  domain/        Meeting, MeetingScope, MeetingStart, Project, Resource, ResourceScope, TranscriptSegment,
                 Speaker, Language, MeetingProfile, Generation, GenerationMode, UserSettings, SessionState
  audio/         AudioSource, AudioFrame, MicrophoneSource, MonoResampler, device listing
  backend/       BackendApi, SttGateway, BackendEndpoint, client/ (BackendClient, transport, sse, speech)
  session/       Session lifecycle, Lane, AudioSources
  generation/    Generator, GenerationEvent
  screenshot/    ScreenCapture, Screenshot, shrink
  settings/      LocalSettings, LocalSettingsStore, SecretStore
  access/        AccessPolicy, Entitlement, AlwaysAllowed
  error.rs, secret.rs, backend_failure.rs

desktop/crates/platform-macos/src
  capture_kit/    shared ScreenCaptureKit pieces: content listing, ThreadSafe, capture_allowed
  system_audio/   AudioSource on ScreenCaptureKit, delegate, CMSampleBuffer parsing
  screen_capture/ ScreenCapture on SCScreenshotManager, CGImage parsing, region mapping
  audio_devices/  CoreAudio transport type of each input
  permissions/    screen recording permission, System Settings panes

desktop/src-tauri/src
  app/           AppState, core composition, lifecycle, hotkeys, overlay, selection, macos_window
  commands/      thin Tauri commands, one file per area
  events.rs      event names and payload types
  deep_link.rs   handling of cueline://auth
  secrets/       Keychain store and debug file store
  logging.rs     tracing to a rotated file

desktop/src
  main.tsx, overlay.tsx, selection.tsx   one entry point per window
  app/           main-window screens and the overlay shell
  features/      auth, session, generation, settings, history, projects, resources, chat, access
  shared/theme/  tokens.css, generated from the design system
  shared/        ipc, ui, store, lib, i18n
```

## API contract

Base prefix `/api/v1`. Routes without `@Public()` require `Authorization: Bearer`. There is no web version, so there are no cookies and no CORS: the only client is the app.

Global guards run in this order: `ThrottlerGuard` (100 requests per minute by default), `AtGuard`, `SubscriptionGuard`.

### Authentication

- `POST /auth/register` `{ email, name, password }` → `{ accessToken, refreshToken, expiresIn }`. Throttled to 5 per minute. The app does not call this route: the sign-in mockup has no name field, and the backend requires one.
- `POST /auth/login` `{ email, password }` → token pair. Throttled to 10 per minute.
- `POST /auth/refresh` `{ refreshToken }`, checked by `RtGuard` → new token pair
- `POST /auth/logout` → deletes the current session
- `GET /auth/google` → opened in the system browser
- `GET /auth/google/callback` → redirect to `cueline://auth?code=...`
- `POST /auth/exchange` `{ code }` → token pair

The one-time code lives in Redis for 60 seconds and burns on exchange. The access token lives 15 minutes, the refresh token 15 days.

Sessions are stored in `auth_sessions`, one row per device, so signing in on a second machine does not sign out the first. The refresh token is stored only as an argon2 hash, and the session id travels in both tokens. Reuse of an old refresh token is treated as compromise: the session is deleted.

### User and settings

- `GET /users/me` → profile
- `GET /settings` → `{ style, defaultLanguage, defaultProfile }`
- `PUT /settings` with the same body

### Projects

- `GET /projects` → `[{ id, name, meetingCount, createdAt, updatedAt }]`, most recently changed first
- `POST /projects` `{ name }` → project
- `PATCH /projects/:id` `{ name }` → renamed project
- `DELETE /projects/:id` → deletes the project together with all its meetings

A project is a hand-made group of meetings: all rounds of one interview, all calls with one client. A meeting belongs to at most one project or to none. Deleting a project takes its meetings with it — a database cascade, and the app asks for confirmation, naming the count. While any meeting in the project is still live, deletion is refused with 409: a row being written right now cannot be pulled out from under the recognition stream.

### Materials

- `GET /resources?scope=user|project|meeting&projectId=&meetingId=` → materials of one level, newest first. Without `scope` — nothing: the level is always explicit
- `POST /resources` multipart `file` plus fields `scope`, `name`, `projectId?` → material with status `pending`: the response arrives as soon as the bytes are accepted, and reading the document happens behind it. The name travels as a separate field instead of coming from `filename` in the header: that one is decoded as latin-1, and anything outside ASCII turns into mojibake
- `POST /resources/text` `{ scope, projectId?, name, text }` → hand-pasted text, immediately `ready`
- `GET /resources/:id` → the same material; the app polls this while `status` is `pending`
- `GET /resources/:id/content` → `{ name, text, digest, chars }`: what was read from the material
- `GET /resources/limits` → `{ maxBytes, maxTextChars }`
- `DELETE /resources/:id` → deletes the material and its object in storage

Values: `scope` is `user | project | meeting`, `kind` is `pdf | markdown | text`, `status` is `pending | ready | failed`, `failure` is `unreadable | no_text_layer | storage`.

A `meeting`-level material uploaded before start has an empty `meetingId`. Such a material is visible only to its uploader and is claimed by the meeting in `POST /meetings` through `resourceIds`. An id in that list that belongs to someone else or is already claimed is 404. Unclaimed ones older than `STAGED_RESOURCE_TTL_HOURS` are removed by `StagedResourcesSweeper`.

Limits: `RESOURCE_MAX_BYTES` (10 MB) per file and `RESOURCE_TEXT_MAX_CHARS` (1,000 characters) per hand-pasted text, and only `text/plain`, `text/markdown` or `application/pdf`. The app does not repeat these numbers but asks `GET /resources/limits`, so they cannot drift apart. Separately there is `RESOURCE_EXTRACTED_MAX_CHARS` (5,000): a ceiling on text extracted from a file, not on what a person types into a field — cutting a document at the input-field level would mean digesting a stump. The upload route has its own body limit through `MulterModule`; `MAX_REQUEST_BODY_BYTES` stays the measure for JSON.

### Meetings

- `POST /meetings` `{ profile, language, replyLanguage?, title?, projectId?, resourceIds? }` → `{ id, status, startedAt }`
- `POST /meetings/:id/finish` → `{ id, status, endedAt }`
- `GET /meetings?limit&cursor&projectId` → a page of the list without transcripts, newest first, 20 by default. The cursor is the id of the last meeting on screen, and the end of the list shows as a page shorter than `limit`, so there is no wrapper with `hasMore`. `projectId` narrows the page to one project, and `projectId=none` to meetings outside every project
- `PATCH /meetings/:id` `{ title?, projectId?, language?, replyLanguage? }` → renames the meeting, moves it between projects and changes its language. `projectId: null` takes the meeting out of its project; someone else's project is 404. The language can be changed only while the meeting is live — on a finished one it is 409
- `DELETE /meetings/:id` → deletes the meeting with its transcript, replies and chats. While live — 409
- `GET /meetings/:id` → meeting, `overview`, `segments`, `generations`, `resources`, `usage`
- `GET /meetings/:id/chats?query=` → chats about this meeting, most recently changed first. `query` searches both chat titles and what was asked in them
- `POST /meetings/:id/chats` → a new chat about this meeting
- `GET /meetings/:id/chats/:chatId` → the questions and answers of this chat, oldest first
- `POST /meetings/:id/chats/:chatId` `{ question }` → SSE with the streamed answer, as in generation
- `DELETE /meetings/:id/chats/:chatId` → deletes the chat with everything asked in it

The backend returns only consumed tokens and audio seconds. The approximate cost is computed by the app in `desktop/src/features/history/cost.ts`: the rates are a single set of constants, because exact money will come with the subscription and the backend will compute it.

Values: `profile` is `daily | interview_candidate | client_call`, `language` is `uk | en | ru`, `mode` is `reply | alternative`, `speaker` is `me | other`. `replyLanguage` is the same trio or `null`, and `null` means "answer in the language being spoken right now".

### Language mid-meeting

An interview often starts in Ukrainian and continues in English. Deepgram can handle mixed languages (`language=multi`), but Ukrainian is not in that set: nova-3 knows it only as the single language of a stream. So the language is switched by hand, and that is not a workaround but the only way that works for Ukrainian.

`PATCH /meetings/:id` with `language` changes the meeting row and the Redis state, and the app does the rest: the session has a `watch` channel, the lanes see the change, close their sockets and open new ones. The backend reads the language from the meeting row at connect time, so nobody else needs to know. The audio sources do not stop, and closing a socket waits for the flush as always, so the phrase spoken at the moment of switching is not lost.

`replyLanguage` is separate from the recognition language because they are different things: recognise what is heard, and answer in the language you are being addressed in. It defaults to `null`, and then the prompt tells the model to follow the conversation.

### WebSocket `/meetings/:id/stt?speaker=me`

The token is passed as `?token=`. The client sends binary frames of PCM 16 kHz mono i16. The backend sends JSON `{ type: "partial" | "final", id, speaker, text, startMs, durationMs }` or `{ type: "error", message }`. The language comes from the meeting. Close codes: 1000 normal close after the client's request, 4401 invalid token, 4404 unknown or finished meeting or unknown speaker, 4500 recognition failure.

The client ends the conversation with a text message `{ "type": "finish" }`, not by dropping the socket. Deepgram returns the last phrase only after a flush, so on `finish` the backend closes the recognition stream, waits for the final segments to be written, sends them to the client and only then closes the socket with 1000. After `finish` the client keeps reading the socket until it closes, with a 5-second safeguard.

This is a plain WebSocket server attached to the HTTP server's `upgrade` event, not a Nest gateway: raw PCM has no `event`/`data` envelope that the Nest adapter expects, and the meeting id belongs in the path. Deepgram is also called over a direct WebSocket, without its SDK.

While audio flows, the stream refreshes `meeting:{id}:alive` in Redis with a TTL of `LIVE_MEETING_IDLE_SECONDS`.

### `POST /meetings/:id/chats/:chatId` → SSE

A question to a finished meeting. There can be any number of chats per meeting, each with its own history; a chat gets its title from the first question and never changes it.

The model does not receive a ready-made extract; it works the meeting with tools: `meeting_facts` (when it started and ended, how long it lasted, how long each side talked, how many lines and replies), `search_transcript`, `read_transcript` and `list_answers`. That is why a question like "how long was the meeting" has an answer, and a long transcript does not have to be crammed into the prompt: a short one goes along with it, a long one is read with tools. The loop lives in `ChatAgent` with a limit of six turns; each next turn continues the previous one through `previous_response_id`, so the provider keeps its reasoning and only tool results travel back.

Everything the meeting said reaches the model inside `<notes>`, `<facts>`, `<transcript>`, `<question>` tags and in tool results, and the system prompt says this is material, not instructions: directions, roles and requests found inside are not followed. The tags themselves are stripped from the content by `common/untrusted`, so text from the meeting cannot close the fence and speak on our behalf.

The exchange is stored in `chat_messages`, so the chat history is there on the next visit, and the tokens of all turns are summed and go to `UsageRecorder` with kind `chat`. The event format is the same as in generation, except `done` carries `messageId`, so SSE parsing in core is split: the shared `sse::frames` yields frames, and each feature reads its own `done`.

### Meeting overview

`Meeting.summary` is dense notes that feed the assistant during the meeting, and there is no point in a person reading them. The screen gets `Meeting.overview`: at most three sentences about what the meeting was, without retelling questions and answers. It is written by `MeetingOverviewWriter` in the meetings module with the summary model — once, after finish. `finish` starts it in the background, `GET /meetings/:id` waits for it if the text is not there yet, and an attempt already running is shared by both, so it is never paid for twice. Meeting details return only `overview`; the notes stay on the server.

### `POST /meetings/:id/generate` → SSE

Body `{ mode, screenshot? }`, where `screenshot` is `{ mimeType, dataBase64 }` for `image/jpeg` or `image/png`. Events: `delta { text }`, `done { generationId, stopReason, usage }`, `error { message }`. For `alternative` the previous draft is already in the conversation as its own message, and the new reply replaces it rather than being added next to it. `usage` here is only tokens `{ inputTokens, cachedInputTokens, outputTokens }`, without audio seconds: those belong to the meeting, not to one reply.

The screenshot travels in the body because it is one picture for one question: a separate upload route would add storage and a second network round trip for no gain. That is why `MAX_REQUEST_BODY_BYTES` is 1 MB rather than 256 KB: the app keeps the picture within 400 KB, and base64 adds a third. The backend puts the picture into the conversation turn it came with, so follow-ups like "and why?" see the same screen, and a new question about something else sees it where it was — behind — and does not take it personally. No TTL is needed for this beyond the turn log's own. Postgres keeps only `Generation.hasScreenshot`: the images themselves are not stored.

This is an ordinary `POST` with SSE frames written by hand, not the `@Sse()` decorator: that one works only on `GET` and takes no body. Ownership and status are checked before the stream opens, so an error arrives as a normal HTTP code, not as an event inside the stream. A dropped connection cancels the provider request, and the partial reply is still saved.

### `GET /health`

Public, `{ status, postgres, redis }`.

## Backend

### Boundaries

- `AtGuard` is global through `APP_GUARD`; `@Public()` removes it. Then comes `SubscriptionGuard`, which in the first version lets everyone through and later will read the subscription status. No other code reads auth headers or cookies. `ThrottlerGuard` runs before both.
- Services hold the rules, repositories hold every Prisma query. A service never injects `PrismaService`.
- Every method working with a meeting takes `userId` and looks up `where: { id, userId }`. A miss is `NotFoundException`, not 403.
- `UsageRecorder` is called after every generation, rolling summary, overview, chat answer, material digest and STT stream.
- `MeetingStateStore` is the only place that knows meeting Redis keys.
- Modules import each other only through `index.ts`.

### Data

Postgres (Prisma, tables and columns in snake_case via `@map`):

```
User            id, email, name, createdAt, updatedAt
UserCredentials userId, hashedPassword?, googleId?
AuthSession     id, userId, hashedRt, expiresAt, createdAt
UserSettings    userId, style?, defaultLanguage, defaultProfile, updatedAt
Project         id, userId, name, createdAt, updatedAt
Meeting         id, userId, projectId?, profile, language, replyLanguage?, title?, status, summary?,
                overview?, contextBrief?, startedAt, endedAt?
Resource        id, userId, scope, projectId?, meetingId?, kind, name, mimeType, byteSize,
                storageKey?, status, failure?, text?, digest?, chars, createdAt, updatedAt
Segment         id, meetingId, speaker, text, startMs, durationMs, createdAt
Generation      id, meetingId, mode, output, stopReason?, inputTokens, cachedInputTokens,
                outputTokens, hasScreenshot, createdAt
ChatSession     id, meetingId, title?, createdAt, updatedAt
ChatMessage     id, sessionId, question, answer, createdAt
UsageEvent      id, userId, meetingId?, kind, model?, inputTokens, cachedInputTokens,
                outputTokens, audioSeconds, createdAt
```

`UsageEvent.kind` is `generate | summarize | stt | chat | digest`. `UsageEvent.meetingId` is `SetNull` on delete, so accounting survives the meeting; everything else cascades.

Redis:

```
meeting:{id}:state           hash: language, replyLanguage, profile, style, contextBrief, today, spokenUpTo
meeting:{id}:window          list: fresh final segments as JSON
meeting:{id}:summary         string
meeting:{id}:turns           string: the last six conversation turns as JSON
meeting:{id}:summarize:lock  string with TTL
meeting:{id}:alive           string, TTL LIVE_MEETING_IDLE_SECONDS, refreshed while audio flows
settings:{userId}            settings cache, TTL 5 minutes, dropped on save
login:code:{code}            userId, TTL 60 seconds
```

On finish `state`, `window` and `summary` get a TTL of `FINISHED_MEETING_TTL_SECONDS`, while `turns` and `alive` are deleted at once.

Everything in Redis can be rebuilt from Postgres, so losing Redis loses no data, only the live context of running meetings.

### Live meeting flow

1. `POST /meetings` creates the row, claims the listed materials, builds the context brief from the three levels of materials as they are at start and stores it in `Meeting.contextBrief`, then writes `state` in Redis with the style from settings, the brief and the day of the meeting, so the system block of the prompt does not change during the meeting. These are sequential steps, not one transaction. Status lives only in Postgres, so there are no two sources of truth.
2. Each WebSocket connection opens a stream in `SttProvider`. Final segments are written to Postgres and to `window`. Interim ones are only returned to the client.
3. After each final segment `Summarizer` checks whether the part outside the window exceeded the threshold. If so and the lock is free, it compresses that part in the background, merges it with the summary, trims the window and updates `Meeting.summary`. Recognition does not wait for it.
4. `generate` reads the state, summary, window and turn log, assembles the conversation from them, streams the reply, saves the generation and appends the turn.
5. The client closes its lanes with `finish`, then calls `POST /meetings/:id/finish`, which sets the status, puts TTLs on the keys and starts the overview writer.

### Materials and the context brief

A material is a standalone object of the user, not part of a meeting. It cannot be otherwise: the `user` and `project` levels are not tied to any meeting. Thanks to this, files upload while the person is still choosing a profile and language, and "prepare, then start" requires neither a draft meeting nor a new status in the meeting state machine. A meeting material before start is a row with `scope: meeting` and an empty `meetingId`; `POST /meetings` claims the listed materials and builds the brief.

`ObjectStorage` hides Cloudflare R2 behind two methods, `put` and `delete`, and the implementation on `@aws-sdk/client-s3` lives in `infrastructure/storage`. R2 holds only the original bytes under the key `users/{userId}/resources/{id}`: to show a file, give it back, or re-extract the text with a better parser later. Everything the prompt reads is in Postgres, so nobody goes to storage during a meeting. Hand-pasted text has no R2 object.

`ResourceExtractor` parses the file right after upload: `unpdf` for PDF, UTF-8 decoding for Markdown and text. A PDF without a text layer yields an empty result — that is `no_text_layer`, there is no OCR. `ResourceIngestor` reads first, then puts the original into storage, and each step fails with its own reason: an unavailable R2 is `storage`, not "could not read the file". The reason is stored as a code, not a sentence: the app is the one that speaks Ukrainian. `ResourceDigester` compresses with the summary model whatever does not fit its level's budget, once per material, and writes the result to `digest`; the cost goes to `UsageRecorder` with kind `digest`. So a large document costs once, not on every reply.

`ContextBriefBuilder` assembles the three levels into one text:

```
<materials>
<about-me>…</about-me>
<about-project>…</about-project>
<about-meeting>…</about-meeting>
</materials>
```

Budgets are 2,000 characters for `about-me`, 4,000 for `about-project`, 6,000 for `about-meeting`, and 10,000 in total.

Materials are reference, not a script. That had to be said outright: on "hi, how are you" the assistant answered with a résumé rundown, because the interview profile prompt demanded an example from experience in **every** answer, and nothing said when to open the materials. Now both depend on the question: a greeting gets a greeting, an example from experience is given when experience is asked about, and the materials are opened only when the last thing said actually needs them. The third lever is the `reply` mode itself. It used to say "if nothing was asked, offer the most useful thing the user could add now", and on its own "hi" the assistant obediently offered the most useful thing — a self-introduction. Now greetings, thanks and small talk get the same kind of line in return, and a substantive contribution remains only when a question or a gap is actually on the table.

Measured on a real résumé, eight runs and two runs each: "hi, how are you" eight times out of eight gives one sentence and returns the question to the other side, "how much experience do you have" gives the correct one year and nine months, "tell us what you did with video" gives a concrete example from the résumé, and on "we're looking for someone who can carry both back end and front end", where no question was asked, the substantive answer remains. A single run proves nothing here: the model at low `effort` has spread, and the first version of the fix came out clean nine times in a row and still stumbled in the app.

The order itself is the priority mechanism: the meeting stands last, closest to the question, the persona says in a separate sentence that in case of conflict the truth is the meeting, then the project, then the user, and the per-level budget cuts from the bottom — first `about-me`; the meeting is never cut. The fences come from the shared `common/untrusted`: an uploaded PDF is foreign text just like the transcript, and a line "ignore previous instructions" inside it must remain material.

Together with the brief, the day of the meeting freezes in the state. Without it "Feb 2025 — Present" in a résumé has nothing to anchor to, and the model measures from its own horizon: asked about years of experience it answered "about a year" where the document said almost two.

The date stands **next to the question**, in the last message beside the mode instruction, not in the system text. This is not a matter of taste but a measurement on a real résumé: the date alone in the system block gave "about a year and a half", the date next to the question gave "a year and seven months" (only the last line of experience counted), and only with the addition "add up all ranges, count an open one to today" did the correct one year and nine months come out. The system block does not change at all, so the cached prefix stays untouched. The chat about a finished meeting has its own line and counts from the day of that meeting, not from today: its materials froze then.

The brief freezes at start in `Meeting.contextBrief` and in the Redis state, like the style. Editing the résumé mid-call must not change the system block of a running meeting, and the chat about a finished one reads the same text from Postgres and sees exactly what the assistant saw.

There is no vector search on purpose. A résumé, a job description and project context together are a few thousand tokens that fit the prompt whole, while retrieval on every keypress would make the prefix different each time and kill the cache that currently gives the largest saving. A place for it is ready and it is elsewhere: the meeting chat already works with tools and is not latency-bound.

### PromptBuilder

The model receives not one large block but a conversation with roles. A turn is what was said after the previous draft (`user`) and the draft we gave for it (`assistant`). The question being asked now is the last message; a screenshot sits inside the turn it came with and is never attached to a new question.

claude.ai and ChatGPT work the same way, and that is exactly why follow-ups about a picture work there while a change of topic does not drag the picture along. While everything was glued into one `user` message, from the model's point of view it looked as if the screenshot of a console with a Promise had been sent **together** with the question about React: it linked them not by oversight but because they really arrived together. No wording of the prompt overrides that — the boundary between turns has to be carried by the structure of the request itself.

Order of messages: the notes, then previous turns, then what was said since, plus the mode instruction and the date. The stable part lives in the system text — persona, profile prompt, style, context brief and the reply language from the meeting state — and does not change during the meeting byte for byte, so OpenAI's automatic prefix cache works: history is only appended at the end.

The boundary between turns is held by `spokenUpTo` in the meeting state — the id of the last segment the model has already seen. `segmentsAfter` cuts what was said since; if the marker was already trimmed by `Summarizer`, the whole window counts as the new turn. `alternative` does not add another turn but rewrites the answer of the last one: retries must not settle in history. The log keeps the last six turns, and only the newest picture stays in it; when a question brings its own screenshot, the old one from history is not sent. One request never carries more than one image. The persona, profile prompts and default style live in `modules/generation/prompts/` as data files.

## The app

### Key types

```rust
enum Speaker { Me, Other }
enum Language { Uk, En, Ru }
enum MeetingProfile { Daily, InterviewCandidate, ClientCall }
enum GenerationMode { Reply, Alternative }
enum SessionState { Idle, Starting, Listening, Stopping }
enum MeetingStatus { Live, Finished }

struct AudioFrame { speaker: Speaker, samples: Vec<i16>, captured_at: Instant }
struct CaptureRect { x: f64, y: f64, width: f64, height: f64 }
struct RawFrame { width: u32, height: u32, stride: usize, bgra: Vec<u8> }
struct Screenshot { mime_type: String, bytes: Vec<u8> }
struct TranscriptSegment { id, speaker, text, start_ms, duration_ms }
struct Meeting { id, project_id, profile, language, reply_language, title, status, started_at, ended_at }
struct MeetingDetails { meeting, overview, segments, generations, resources, usage }
struct MeetingStart { profile, language, reply_language, project_id: Option<ProjectId>, resource_ids: Vec<ResourceId> }
enum MeetingScope { All, Outside, Project(ProjectId) }
enum ResourceScope { User, Project(ProjectId), Meeting(Option<MeetingId>) }
enum ResourceKind { Pdf, Markdown, Text }
enum ResourceStatus { Pending, Ready, Failed }
enum ResourceFailure { Unreadable, NoTextLayer, Storage }
struct Resource { id, project_id, meeting_id, kind, name, byte_size, status, failure, created_at }
struct ResourceContent { name, text, digest, chars }
struct ResourceLimits { max_bytes, max_text_chars }
struct NewResourceFile { name, mime_type, bytes }
struct UserSettings { style, default_language, default_profile }
struct LocalSettings { backend_url, input_device, hotkeys }
struct Hotkeys { reply, alternative, screenshot, hide, interact }
struct Tokens { access_token, refresh_token, expires_in }
struct Secret(String)  // Debug prints Secret(***)
enum Entitlement { Allowed, Denied { reason: DenialReason } }
enum DenialReason { NotSignedIn, NoSubscription }
```

### Traits

```rust
trait AudioSource {
    fn start(&mut self, sink: mpsc::Sender<AudioFrame>) -> Result<()>;
    fn stop(&mut self) -> Result<()>;
}

trait BackendApi {
    async fn health(&self) -> Result<Health>;
    async fn sign_in(&self, email: &str, password: &str) -> Result<Tokens>;
    async fn exchange_code(&self, code: &str) -> Result<Tokens>;
    async fn me(&self) -> Result<Profile>;
    async fn user_settings(&self) -> Result<UserSettings>;
    async fn save_user_settings(&self, settings: &UserSettings) -> Result<UserSettings>;
    async fn create_meeting(&self, start: &MeetingStart) -> Result<Meeting>;
    async fn finish_meeting(&self, id: &MeetingId) -> Result<Meeting>;
    async fn list_meetings(&self, limit: u32, cursor: Option<&str>, scope: &MeetingScope)
        -> Result<Vec<Meeting>>;
    async fn meeting(&self, id: &MeetingId) -> Result<MeetingDetails>;
    async fn rename_meeting(&self, id: &MeetingId, title: &str) -> Result<Meeting>;
    async fn move_meeting(&self, id: &MeetingId, project: Option<&ProjectId>) -> Result<Meeting>;
    async fn set_meeting_language(&self, id: &MeetingId, language: Language,
        reply_language: Option<Language>) -> Result<Meeting>;
    async fn delete_meeting(&self, id: &MeetingId) -> Result<()>;
    async fn list_resources(&self, scope: &ResourceScope) -> Result<Vec<Resource>>;
    async fn upload_resource(&self, scope: &ResourceScope, file: &NewResourceFile)
        -> Result<Resource>;
    async fn add_resource_text(&self, scope: &ResourceScope, name: &str, text: &str)
        -> Result<Resource>;
    async fn resource(&self, id: &ResourceId) -> Result<Resource>;
    async fn resource_content(&self, id: &ResourceId) -> Result<ResourceContent>;
    async fn resource_limits(&self) -> Result<ResourceLimits>;
    async fn delete_resource(&self, id: &ResourceId) -> Result<()>;
    async fn list_projects(&self) -> Result<Vec<Project>>;
    async fn create_project(&self, name: &str) -> Result<Project>;
    async fn rename_project(&self, id: &ProjectId, name: &str) -> Result<Project>;
    async fn delete_project(&self, id: &ProjectId) -> Result<()>;
    fn generate(&self, id: &MeetingId, mode: GenerationMode, screenshot: Option<&Screenshot>)
        -> DeltaStream<'_>;
    async fn meeting_chats(&self, id: &MeetingId, query: Option<&str>) -> Result<Vec<ChatSession>>;
    async fn start_meeting_chat(&self, id: &MeetingId) -> Result<ChatSession>;
    async fn chat_messages(&self, id: &MeetingId, chat: &ChatId) -> Result<Vec<ChatMessage>>;
    async fn delete_meeting_chat(&self, id: &MeetingId, chat: &ChatId) -> Result<()>;
    fn ask_in_chat(&self, id: &MeetingId, chat: &ChatId, question: &str) -> ChatStream<'_>;
}

trait SttGateway {
    async fn open(&self, meeting_id: &MeetingId, speaker: Speaker) -> Result<SttLane>;
}

type SttLane = (Box<dyn SttSink>, Box<dyn SttEvents>);

trait SttSink {
    async fn send(&mut self, frame: &AudioFrame) -> Result<()>;
    async fn close(&mut self) -> Result<()>;
}

trait SttEvents {
    async fn next(&mut self) -> Option<SttEvent>;
}

enum SttEvent { Partial { speaker, text }, Final { id, speaker, text, start_ms, duration_ms }, Failed { message } }

trait AudioSources {
    fn microphone(&self, device_id: Option<String>) -> Box<dyn AudioSource>;
    fn system_audio(&self) -> Option<Box<dyn AudioSource>>;
}

trait ScreenCapture {
    async fn capture(&self, rect: CaptureRect) -> Result<Screenshot>;
}

trait AccessPolicy {
    async fn check(&self) -> Result<Entitlement>;
}

trait SecretStore {
    fn get(&self, key: SecretKey) -> Result<Option<Secret>>;
    fn set(&self, key: SecretKey, value: &Secret) -> Result<()>;
    fn delete(&self, key: SecretKey) -> Result<()>;
}

enum SecretKey { AccessToken, RefreshToken }
```

`BackendApi` and `SttGateway` share one implementation, `BackendClient`, on `reqwest` and `tokio-tungstenite`, plus fakes for tests. It refreshes the access token with the refresh token on 401 by itself and stores the new pair in `SecretStore`. The halves of a lane are separate because a lane writes audio and reads transcript at the same time.

### Session

`Session` owns everything that lives between start and stop: audio sources, STT streams, the transcript for display. States:

```
Idle → Starting → Listening → Stopping → Idle
```

Each transition is published as a `session:state` event. An error during `Starting` returns to `Idle` with the reason and finishes the meeting on the backend if it was already created. `AccessPolicy::check` is called before `Starting`.

Audio pipeline per source: `AudioSource` → resampler to 16 kHz mono i16 → 100 ms frames → `SttSink`.

Each speaker has its own lane. A dropped socket does not end the meeting: the lane reopens the line with the same meeting, up to five attempts with growing pauses starting at 500 ms; 4401 and 4404 are not retried. If the audio source goes silent for good, the lane says so in the transcript and stops. Missing meeting audio does not block the start: the meeting runs with the microphone alone, and the reason comes back in `startedSession.systemAudioProblem`.

Stop asks each line to finish and reads it to the end, otherwise the last phrase is lost: the backend sends it only after the close request. Draining a lane is capped at 5 seconds.

### Generation

`Generator` lives outside the session and holds only the current request. Starting cancels the previous one through its token, checks `AccessPolicy`, opens the SSE stream and sends `Started` to the UI, then `Delta` for each chunk of text, and finally `Finished` or `Failed`. Cancelling simply drops the stream: the disconnect reaches the backend, and it saves the partial reply.

The HTTP client for generation is separate and has no overall timeout: the reply takes as long as it takes, and only establishing the connection is bounded. The stream ends with a `done` event; if the body broke off earlier, the UI keeps what was written and shows that the reply is unfinished.

### Screenshot

The "screenshot" key asks the model about what is on the screen with the same question that just sounded in the conversation: there is no separate text field, and the backend builds the context the same way as for a normal reply.

Permission is checked before the selection opens: `capture_kit::capture_allowed` asks ScreenCaptureKit itself (the `CGPreflightScreenCaptureAccess` flag lies), and without permission the app says so instead of letting the user draw a rectangle into the void. The same call answers whether meeting audio is available: both captures depend on one permission.

Capture is done by ScreenCaptureKit inside our own process (`SCScreenshotManager` in `platform-macos/screen_capture`), not by `/usr/sbin/screencapture`. macOS checks a child process not against our app but against the "responsible" process of its chain — during development that is WebStorm, which launched `tauri dev`. Without permission `screencapture` does not fail and writes nothing to stderr: it returns the desktop without a single window, and the model gets the wallpaper instead of the question. SCK in our own process uses the same permission as meeting audio and returns a refusal as a visible error.

The user picks the region, because the system crosshair does not give its rectangle back: `app/selection.rs` opens a transparent `selection` window over all displays at once (one window the size of the union of their rectangles), `features/generation/RegionSelector` draws a dim layer with a cut-out, and Esc or right-click cancels. The window is created on the main thread via `run_on_main_thread`, because AppKit accepts no other, while the hotkey lives on a tokio worker. It is raised by the same code as the overlay (`app/macos_window.rs`) and, like the overlay, stays a `NonactivatingPanel`: a window that activates the app drags the user to the Space where the app lives, while the region must be selected where the browser is now. The only difference is that the selection becomes the key window (`makeKeyAndOrderFront`) — a non-activating panel has the right to the keyboard and the first click without activating the app. Escape is additionally caught by a global shortcut registered for the duration of the selection, so cancelling works even if key status was not granted. `set_content_protected(true)` keeps the window itself out of the capture, so the dimming does not end up in the frame even if the compositor has not removed it yet.

A second press while the screen is already dimmed does nothing: that is a person checking whether the first one worked. The window is not recreated every time but reused if it still exists: `close()` in Tauri is a message to the event loop, so a just-closed window still holds its label, and the next attempt would fail with "webview with label `selection` already exists".

A window on one monitor would not do: people usually ask about a screen other than the one the app is on, and on other displays there would be nothing to draw on.

The rectangle comes from the webview in the window's CSS pixels; `selection.rs` adds the window's origin and hands over a `CaptureRect` in global points. `screen_capture` finds the `SCDisplay` that contains the centre of the rectangle, sets it as `sourceRect` relative to that display's origin, and computes the frame size from that display's own density (`CGDisplayModeGetPixelWidth` divided by the width in points), so on Retina the capture comes out in native resolution, and on an ordinary neighbouring screen it is not upscaled. A rectangle stretched across two displays is clipped to the one holding its centre.

The picture is compressed by core, not by the platform crate: `screenshot::shrink` reads BGRA respecting `stride`, reduces the long side to 1,400 px and encodes JPEG, lowering quality until it fits in 400 KB. The meeting is checked before the selection appears: selecting a region only to then hear "no meeting is running" would be cruel.

Hotkeys are taken from local settings and re-registered when they are saved. The "reply", "alternative" and "screenshot" keys are different; another one shows or hides the overlay, and one more toggles overlay interaction. Defaults: reply `Alt+R` (⌥R from the mockup), alternative `CommandOrControl+Shift+A`, screenshot `Alt+S`, hide `CommandOrControl+Shift+H`, interact `CommandOrControl+Shift+M`. The hint in the sidebar and the chip in the overlay draw the same string from settings, so they do not drift apart.

### IPC

Commands UI → Rust:

- auth: `auth_state`, `sign_in`, `start_login`, `complete_login`, `logout`
- session: `session_state`, `start_session`, `switch_meeting_language`, `stop_session`
- generation: `generate`, `cancel_generation`
- screen: `finish_selection`, `cancel_selection`
- meetings and chat: `list_meetings`, `get_meeting`, `rename_meeting`, `move_meeting`, `delete_meeting`, `meeting_chats`, `start_meeting_chat`, `chat_messages`, `delete_meeting_chat`, `ask_in_chat`
- projects: `list_projects`, `create_project`, `rename_project`, `delete_project`
- materials: `list_resources`, `upload_resource`, `add_resource_text`, `get_resource`, `resource_content`, `resource_limits`, `delete_resource`
- settings: `get_local_settings`, `save_local_settings`, `get_user_settings`, `save_user_settings`, `check_backend`
- audio: `list_audio_devices`, `start_audio_check`, `stop_audio_check`, `system_audio_allowed`, `open_audio_permission`

Events Rust → UI: `auth:state`, `session:state`, `audio:level`, `source:status`, `transcript:segment`, `generation:started`, `generation:delta`, `generation:finished`, `generation:failed`, `chat:delta`, `chat:finished`, `chat:failed`, `overlay:interaction`, `app:error`. Chat events carry `chatId`, not the meeting: a chat screen takes only its own.

The `generation:started` event carries `{ mode, withScreenshot }`, so the overlay and history can say that the reply read the screen.

`source:status` arrives as one event per source right after the meeting starts: `{ speaker, active }`. The UI shows the microphone and meeting-audio statuses from them and forgets them when the meeting ends. While there is no meeting, the system-audio status comes from the `system_audio_allowed` command: without it the source would hang on "not checked" forever even when permission is already granted. A click on a source row opens the right macOS pane through `open_audio_permission`, and for meeting audio that is "Screen Recording", not the microphone.

An error from `app:error` is shown as a strip at the bottom of the main window and disappears by itself after twelve seconds (`shared/lib/useTransientMessage`). A strip that keeps hanging reads as the state of the last action: the permission is already granted, while the screen still says it is not.

Event names and payload shapes are defined once in `desktop/src-tauri/src/events.rs` and duplicated as types in `desktop/src/shared/ipc/events.ts`.

### Windows

- The meeting screen opens with a click on a row in the list and shows exactly that meeting: on the left a list of chats about this meeting with search and a "New chat" button, in the centre cards for the overview, transcript, replies, materials and cost. There is no list of other meetings here: they are browsed from the main screen, where pages load as you scroll.
- A chat is another screen of the same window, not a new window: `View` in `app/App.tsx` has a `chat` variant with `meetingId` and `chatId`, and the back arrow leads from a chat to its meeting, not to the main screen. The screen itself looks like a messenger: the question on the right in an accent bubble, the answer on the left, the time in the corner, and the thread sticks to the bottom until the user starts scrolling up.
- The same chat list stands on the left both on the meeting screen and on the chat screen, where the open chat is outlined: you move between chats of one meeting without going back. Deletion lives in the list row and asks for confirmation with a dialog that names the chat; if the open chat was deleted, the app returns to the meeting.
- Main window: `titleBarStyle: "Overlay"` and `hiddenTitle`, so the traffic lights are native, and `app/TitleBar.tsx` draws its own title strip with room for them. On the left the session sidebar (profile, language, reply language, project, materials, audio sources, start), on the right the projects bar and the meeting list. `View` has four variants: `main`, `meeting`, `chat`, `settings`; there is no separate history view — the meeting list on the main screen is the history. Settings are split into five tabs in the left rail: "General" (profile, language, style, account), "Materials", "Audio", "Hotkeys", "Advanced". A tab is local screen state, not a route: there is one window, and the same arrow in the header leads back. Each tab saves its own, so the "Save" button lives in it rather than one for the whole screen.
- The overlay does not catch the mouse: `set_ignore_cursor_events(true)` passes clicks to the app below, so a button in the browser under the overlay can be pressed. A hotkey (`interact` in settings) gives the window the mouse back, and only in that mode can it be dragged, resized and its transcript scrolled; the UI learns about the mode from the `overlay:interaction` event and highlights the border. The overlay has no buttons at all; copying is text selection in interaction mode.
- The transcript in the overlay shows the whole meeting: it sticks to the bottom until the user starts scrolling, and upward it loads forty lines at a time, so a long meeting does not keep thousands of rows in the DOM.
- The overlay is visible from app start, not only during a reply: it is "furniture" that shows the session state, the transcript and the last reply. A hotkey hides and restores it. When the meeting ends it empties: a session in the `idle` state holds neither transcript nor reply, and `stop_session` first cancels a generation that is still writing, and only then stops the session. Clearing has to happen there, because windows do not share memory: the overlay has its own React root and its own stores, so a call in the main window does not reach it. The window is declared hidden in `tauri.conf.json`, has its own entry point `overlay.html` and its own capability set. The live transcript lives here, not in the main window: during a meeting the user looks at the meeting, not at the app.
- The overlay is transparent: `transparent: true` plus `macOSPrivateApi`, because without it `backdrop-filter` paints a solid rectangle instead of the glass from the mockup. The price of this decision — the App Store is out, distribution is a notarized DMG. The system shadow is off (`shadow: false`) and CSS draws the shadow, otherwise a rectangular frame appears around the transparent window.
- The region-selection window lives only during selection: `app/selection.rs` creates it on the hotkey and closes it as soon as the rectangle is chosen or the selection is cancelled. It is transparent, borderless, catches the mouse and keyboard, and is hidden from capture.
- The overlay window level is raised to `NSScreenSaverWindowLevel`, and `collectionBehavior` is `CanJoinAllSpaces | FullScreenAuxiliary | Stationary | IgnoresCycle`, plus `hidesOnDeactivate(false)`. `CanJoinAllSpaces` alone is not enough: a window of an app with a Dock icon stays on the Space where it was opened, whatever the collection behaviour says. Only an `NSPanel` reaches every Space, so `app/macos_window.rs` swaps the window's class to `NSPanel` while the flags are set (bringing in the `NonactivatingPanel` style) and immediately swaps the original back: the window cannot be left a panel, because tao hands out `NSKVONotifying_TaoWindow`, and a class swap permanently breaks the KVO observers AppKit keeps on the window — the app crashes on `removeObserver`. The flags are set again on every show and always on the main thread via `run_on_main_thread`. This is the only piece of AppKit in `src-tauri`, and it lives in `app/macos_window.rs` because both always-on-top windows use it: the overlay and the region selection.
- The overlay gets its position once, on the monitor under the cursor, and only after `show()`: tao centres the window on first show, so a position set earlier is lost. After that the window does not move by itself. The user drags it by its header, and that is a custom `pointerdown` handler with `setPosition` (`useOverlayDrag`), not `data-tauri-drag-region`: the region ignores presses that hit a child element, and the header is almost entirely children.
- `set_content_protected(true)` removes the overlay from screen sharing. Side effect: it is not visible on an ordinary screenshot either, even though it is on screen. Its presence should be checked with `CGWindowListCopyWindowInfo`, not a screenshot, and its Space membership with the private `CGSCopySpacesForWindows`: the answer should list every Space.

## Security and subscription

The app on the user's disk is not trusted: anything inside the binary can be extracted, any local check can be cut out. Therefore:

- Provider keys exist only in the backend `.env`. The app has the backend address and a token pair: in release builds in Keychain, in debug builds in a file with `0600` permissions, because the ad-hoc signature changes with every build and Keychain would ask for a password each time.
- All product logic is on the backend: prompts, context, models, limits. The only way to generate anything is a generation for your own meeting.
- Google sign-in goes through the system browser and a one-time code, not through an embedded webview. RFC 8252 recommends this, and Google allows nothing else.
- The subscription is checked on the backend in `SubscriptionGuard`. `AccessPolicy` in the app exists only for the UI, to show a paywall before a 403.
- `ThrottlerGuard` limits every client to 100 requests per minute, registration to 5 and login to 10.
- Transcripts are stored on the server. For a commercial version this requires a privacy policy and a way to delete a meeting and the account.

## Reliability

- Expired `auth_sessions` are removed hourly by `ExpiredSessionsCleaner`, "stuck" meetings are closed every half hour by `StaleMeetingsCloser`, and unclaimed meeting materials are removed hourly by `StagedResourcesSweeper`. A meeting counts as stuck when its `meeting:{id}:alive` key in Redis has disappeared: the recognition stream refreshes it while audio flows, so a long but living meeting is not cut off. The key's TTL and the age threshold come from `LIVE_MEETING_IDLE_SECONDS`.
- Provider limits in config: `LLM_TIMEOUT_MS` per OpenAI request and `STT_CONNECT_TIMEOUT_MS` for the handshake with Deepgram. The reply stream is not limited: the timeout applies to establishing the connection.
- `MAX_REQUEST_BODY_BYTES` limits the request body. The body parser error has its own status, so the filter returns it as 413 in the same error shape, not as 500.
- The app writes logs through `tracing` to `app_log_dir` with daily rotation and seven files of history. Secrets do not get there: `Secret` prints as `Secret(***)`.
- Quitting the app goes through `RunEvent::Exit`: it stops the audio check and the session, that is, finishes the meeting on the backend, with a 5-second limit. Switching views in the window does not affect the session.
- The core HTTP transport makes up to three attempts with exponential backoff from 300 ms, but only on a timeout, a connection failure or a 5xx. A refusal such as 404 or 409 is not retried. JSON requests have a 10-second timeout; streams have only a connect timeout.

## Build and run

Step-by-step commands are in `docs/RELEASE.md`. The decisions:

- The backend ships as an image from `backend/Dockerfile` and `docker-compose.prod.yml`. Migrations are applied by a separate `migrate` service from the `build` stage, and the backend starts only after it completes successfully. The runtime image does not contain the Prisma CLI: it pulls in Studio and pglite, and `--no-optional` drops optional peer dependencies and leaves the image half the size.
- Backend secrets live in `backend/.env.production`, the Postgres password in the root `.env` for compose. The Postgres and Redis addresses are set by compose itself, so they cannot be accidentally overridden from the env file.
- The app icon source is `desktop/src-tauri/icons/icon.svg`; the set of sizes is generated by `tauri icon`. Mobile sets are not kept.
- The bundler puts the `cueline://` scheme into `Info.plist` itself from the deep-link plugin config, so `CFBundleURLTypes` is not written by hand. `LSMinimumSystemVersion` is 13.0, because audio capture through ScreenCaptureKit is newer than that.
- Signing and notarization use Apple environment variables that Tauri reads. Entitlements are minimal: only `com.apple.security.device.audio-input`. Screen recording has no entitlement; the user grants it.
- The first screen is sign-in from the mockup. There is no separate onboarding: the server address, device and hotkeys live in settings behind the gear, and macOS asks for permissions itself at the first meeting.

## Audio and Bluetooth

As soon as the app opens the microphone of a Bluetooth headset, macOS switches it from A2DP to the call profile: 16 kHz mono, and the meeting in the headphones starts to sound like a telephone. This cannot be avoided from the app side, so when no microphone is chosen by hand, the composition root takes the built-in one: `platform-macos/audio_devices` asks CoreAudio for the transport of each device, and `app/microphone_choice.rs` substitutes the built-in microphone for a Bluetooth one. In settings such inputs are marked `(Bluetooth)`, and choosing one of them shows what it will lead to.

## Theme and UI components

Colours, typography, spacing and radii come from the design system as one file, `desktop/src/shared/theme/tokens.css`, generated from its `tokens.json`. It declares tokens in `@theme`, so Tailwind turns them into utilities (`bg-surface-elevated`, `text-body`, `p-5`, `rounded-lg`), and the dark theme is the same names with other values under `prefers-color-scheme: dark` and under `[data-theme='dark']`. Components never write hex colours: a design-system rule, and it also saves the code from "if dark theme" branches.

A screen is a set of small components, not one file: the session sidebar is made of `ProfileSwitcher`, `LanguageSelect`, `ReplyLanguageSelect`, `ProjectSelect`, `AudioSourceStatus` and `StartMeetingButton`; the overlay (`ResponseOverlay`) of `StatusIndicator`, `LiveTranscript` and `ResponseBlock`. They all take data through props, and hooks over stores assemble the state, so none of them knows about Tauri.

The state in these components is real: the profile comes from user settings, source statuses from the `source:status` event, the transcript from `transcript:segment` (an interim line is grey and italic until the final one arrives), the reply text accumulates from `generation:delta`. "Recording" instead of "Listening" turns on while an unfinished line from the microphone hangs in the transcript.

## Projects on the main screen

To the right of the session panel, at the top, is the projects bar (`features/projects/ProjectsBar`), and under it the same meeting list. A project card shows the name and the number of meetings; the "No project" card stands first. A click on a card narrows the list below to that project, a second click returns all meetings — so there is no separate project screen and nowhere to go to drag a meeting.

A meeting goes into a project by dragging its row onto a card. The row carries its id under its own data type `application/x-cueline-meeting`: the drag content is unavailable until dropped, but the list of types is available, so the card sees on `dragover` that a meeting is flying over it and lights up only then. Dropping on "No project" takes the meeting out of its project, so no separate button is needed for the way back. Tauri's native drag-and-drop is disabled in the main window (`dragDropEnabled: false`): it is needed only for files from the system, and HTML5 drag inside the webview conflicts with it.

Renaming happens in place: a pencil in the row or on the card turns the name into a field, Enter saves, Esc cancels, an empty or unchanged name saves nothing (`shared/lib/useRename`). Deletion goes through `ConfirmDialog`, and the dialog text for a project with meetings names their count, because exactly those will disappear with the project.

Both lists are re-read from the backend after any change: a single `revision` number in `MainWindow` grows on every successful action, and `useProjects` and `useMeetings` reload themselves when it changes. A dragged meeting simultaneously disappears from one list, appears in another and changes two counters, so a local row patch would drift from the server anyway.

## Materials in the app

`features/resources` holds one panel for all three levels: a list of materials, an "Add file" button through `tauri-plugin-dialog` and a form for pasted text. The difference between levels is only the `ResourceScope` that goes into the command, so the form is the same everywhere. The file picker returns a path, and Rust reads the bytes: the type is checked by extension before the server is contacted, so "this is not a PDF, Markdown or text" shows at once.

The user level lives in the "Materials" tab in settings. The project level appears above the meeting list when a project is open on the projects bar — there is still no separate project screen. The meeting level stands on the start panel, together with the profile, language and the project selector.

`useResources` polls a material while it is `pending`: the upload responds at once, and reading the document continues on the server behind it. The polling is `setInterval`, not a single `setTimeout`: the list of pending ids does not change while they are being read, so the effect would not restart itself, and a single attempt left the panel on "Reading…" until the screen was reopened. The same wait holds the start button: while any material is being read, it is busy, because the brief is built from what has already been read. After start `revision` grows, and the meeting's material list is re-read already empty — the meeting took them.

A ready material opens with a click on its name: `ResourceViewer` asks `GET /resources/:id/content` and shows the text, and when the document did not fit its level's budget — the compressed version, because that is what goes to the model. This shows what was actually read from the file, not just that it was accepted.

The finished-meeting screen shows in a separate card what the assistant actually saw: the rows arrive in `GET /meetings/:id` together with the transcript.

## Cross-platform

The app's platform code lives in `desktop/crates/platform-*`. The composition root picks the implementation through `cfg(target_os)`. For Linux and Windows a new crate is added with an `AudioSource` for system audio and, if needed, its own permissions module. The rest of the code does not change.
