# Cueline — implementation plan

A product of two parts in one repository:

- `backend/` — a NestJS server that owns all product state: users, meetings, transcripts, summaries, settings, prompts. It holds the provider keys, recognises speech through Deepgram and generates replies through OpenAI.
- `desktop/` — a thin Tauri app: it captures audio, sends it to the backend, shows the live transcript, asks for a reply on a hotkey and shows it in an overlay.

The first version is built for macOS. The code is structured so that Linux and Windows are added by replacing one audio-capture module, and a subscription is added without edits all over the code.

## Key decisions

| Question                   | Decision                                                                                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                 | pnpm workspace: `desktop`, `backend`. Shared documents in `docs`                                                                                                                                                                                                                                         |
| Backend style              | Conventions carried over from a reference project: `common` / `infrastructure` / `modules`, a repository for every Prisma query, `index.ts` as the module's public interface, the `~` alias, zod for env, Swagger                                                                                        |
| Backend                    | NestJS 11, TypeScript strict, Prisma 7 with `@prisma/adapter-pg`, PostgreSQL, ioredis, `openai`, Deepgram through `ws`                                                                                                                                                                                   |
| Development infrastructure | `docker compose` at the root brings up Postgres and Redis. The backend runs locally through pnpm                                                                                                                                                                                                         |
| Postgres                   | Users, credentials, settings, projects, meetings, final segments, generations, chats, materials, usage accounting                                                                                                                                                                                        |
| Redis                      | Live meeting state: window of fresh segments, summary, the last six conversation turns, summarization lock, liveness heartbeat. Plus settings cache and one-time sign-in codes for the app. TTL on everything                                                                                            |
| Authentication             | Email with password and Google OAuth, JWT access and refresh, tokens in the response body. There is no web version, so no cookies and no CORS. Google sign-in goes through the system browser and a one-time code                                                                                        |
| Rate limiting              | `ThrottlerGuard` globally: 100 requests per minute, stricter on registration and login                                                                                                                                                                                                                   |
| Subscription               | `SubscriptionGuard` next to `AtGuard` and `UsageRecorder` as the only points on the backend. In the app, `AccessPolicy` at session start and generation. First version: everything is allowed                                                                                                            |
| App                        | Tauri 2, Rust core, React + TypeScript UI. No local database: history and settings come from the backend                                                                                                                                                                                                 |
| Provider keys              | Only in the backend `.env`                                                                                                                                                                                                                                                                               |
| Microphone                 | `cpal`, cross-platform                                                                                                                                                                                                                                                                                   |
| macOS system audio         | ScreenCaptureKit through Rust bindings, behind the `AudioSource` interface                                                                                                                                                                                                                               |
| Speech recognition         | Deepgram nova-3 streaming, two separate streams per meeting: microphone and system audio                                                                                                                                                                                                                 |
| Language                   | Chosen before start: uk, en, ru, and switchable during the meeting. Reply language is separate and by default follows the conversation                                                                                                                                                                   |
| Generation                 | OpenAI Responses API: `gpt-5.6-terra` for replies and the meeting chat, `gpt-5.4-mini` for the background summary, overview and material digests, both in the backend config. Chosen by measuring latency and reply length on real prompts                                                               |
| Context                    | The backend keeps a window of fresh segments in Redis and compresses older ones into a summary in the background. The prompt is a conversation with a stable system prefix that OpenAI caches automatically                                                                                              |
| Hotkeys                    | `tauri-plugin-global-shortcut`. Keys for "reply", "alternative", "screenshot", show the overlay and give it the mouse                                                                                                                                                                                    |
| Screenshot                 | Our own region-selection window plus ScreenCaptureKit in our own process: a child `screencapture` without permission silently returns the wallpaper. The picture is compressed in core and travels in the body of `generate`. It lives in the conversation turn log in Redis; Postgres keeps only a flag |
| Overlay                    | A separate always-on-top window, invisible during screen sharing, transparent to the mouse by default                                                                                                                                                                                                    |
| Start                      | Manually with a button. No automatic meeting detection                                                                                                                                                                                                                                                   |
| Materials for the AI       | Three levels: meeting, project, user. A resource is a standalone user object, not part of a meeting, so it uploads before the meeting exists and is claimed by it at start. Conflicts are resolved by the order of levels, not by the model                                                              |
| File storage               | Cloudflare R2 through the S3-compatible API behind the `ObjectStorage` interface. Originals in R2, extracted text and digest in Postgres. No vector search: the materials fit into the prompt whole                                                                                                      |

## First-version features

- **Sign-in.** Email and password right in the app; Google sign-in opens the browser and returns through a one-time code.
- **Meeting session.** A start/stop button, choice of profile (stand-up, interview as candidate, client call) and language. The meeting is created on the backend.
- **Live transcript.** Two audio streams, lines labelled "me" or "others", interim results replaced by final ones.
- **Reply on a key.** The backend builds the context itself from the summary, fresh transcript, profile, style and materials. The reply streams into the overlay; copying is text selection.
- **Alternative.** A second key asks for another angle or wording; the backend remembers the previous reply and replaces it.
- **Question with a screenshot.** A key opens our region selection over all displays, the capture goes together with the question that just sounded in the conversation, and the model answers based on what is on the screen.
- **Style and defaults.** Style, default language and profile are stored on the backend. An empty style means the default: brief, conversational, no corporate filler, up to 15 seconds aloud.
- **History.** A list of past meetings with overview, transcript, generated replies, materials and cost of each.
- **Meeting chat.** Any number of chats per finished meeting; the model answers with tools over the transcript.
- **Projects.** Meetings are grouped into projects (for example, all rounds of one interview). The projects bar sits above the meeting list on the main screen, a meeting is added by dragging, projects and meetings are renamed and deleted.
- **Language mid-meeting.** The conversation language switches during the call: an interview that started in Ukrainian and moved to English does not lose the transcript. The reply language is separate and by default follows the conversation.
- **Materials for the AI.** Before a call you can give the assistant documents: PDF, Markdown or just pasted text. Three levels — résumé and general context in the user's settings, project description on the project, materials of a specific meeting on the start panel. Conflicts between levels are resolved in favour of the meeting, then the project, then the user.
- **Cost.** The backend counts tokens and audio seconds per meeting, the app shows an approximate cost.

## Groundwork for the future (the code has extension points, no implementation)

- Subscription through a merchant of record, per-user limits in Redis, `SubscriptionGuard`.
- Screenshots in meeting history: now the picture is not stored, only a flag remains on the reply.
- Memory across meetings.
- Vector search over materials: `resource_chunks` with pgvector as a tool of the meeting chat. While materials are few, they go into the prompt whole, and retrieval would only break the cached prefix.
- Diarization of other participants and name substitution.
- Local Whisper as free STT.
- Linux (PipeWire) and Windows (WASAPI loopback) audio sources.

## Architecture

Details in `docs/ARCHITECTURE.md`, build and release steps in `docs/RELEASE.md`. In short:

```
backend/src/common          config, decorators, dto, filters, guards, middleware, sse, untrusted, types
backend/src/infrastructure   prisma, redis, hashing, llm, stt, storage
backend/src/modules          auth, user, settings, projects, meetings, resources, stt, context, generation, chat, usage, health
desktop/crates/core          platform-independent core without Tauri
desktop/crates/platform-macos system audio, screen capture, audio devices, permissions for macOS
desktop/src-tauri            commands, events, windows, hotkeys, composition
desktop/src                  React UI: main window, overlay, settings, history, projects, materials, chat
```

Data flow: `AudioSource` → PCM 16 kHz mono → WebSocket to the backend → Deepgram → segment into Redis and Postgres → event to the app → on a key `POST generate` → the backend builds context from Redis → OpenAI → SSE into the overlay.

## Tasks in order

Each task ends in a working state that can be run and checked. The next task does not start until the previous one passes every check from `CLAUDE.md`.

Done: tasks 1–16 and 18–25. Next: 17. This line is updated in the same commit as the task's code.

Tasks are kept as they were planned. Where a later task changed the result of an earlier one, the earlier one says so.

### 1. Monorepo skeleton and infrastructure

- Root: `pnpm-workspace.yaml`, `docker-compose.yml` with Postgres and Redis, shared `.editorconfig`, `.prettierrc`, `.gitignore`, scripts, git init.
- `backend/`: NestJS 11 via `nest new`, the `~` alias, strict TypeScript, ESLint, Prettier, Jest, Swagger, `ConfigModule` with env validation through zod, Prisma generating the client into `src/generated/prisma`, `.env.example`.
- `desktop/`: Tauri 2 + React + TypeScript + Vite via `create-tauri-app`, Tailwind, ESLint, Prettier, Vitest. Cargo workspace: `crates/core`, `crates/platform-macos`, `src-tauri`.
- Result: `docker compose up -d`, the backend answers health, the app opens an empty window.

### 2. Backend: infrastructure and shared layer

- `infrastructure/prisma`: `PrismaService` on `@prisma/adapter-pg`, a global module.
- `infrastructure/redis`: `RedisService` on ioredis with typed helpers, a global module, clean shutdown.
- `infrastructure/hashing`: `HashingService` on argon2.
- `common`: decorators `@Public`, `@GetCurrentUserId`, `@GetCurrentUser`, shared response DTOs, a global exception filter and a logger with `requestId`.
- `modules/health`: checks Postgres and Redis.
- Result: health shows the state of both stores, an unknown route returns the same error shape.

### 3. Backend: authentication and user

- Prisma: `User`, `UserCredentials`, `AuthSession`, `UserSettings`. First migration.
- `modules/auth`: registration, login, logout, token refresh, access and refresh strategies. A session per device, the refresh token only as a hash, reuse of an old token kills the session.
- Google OAuth: strategy, controller, linking by email, user creation.
- Google sign-in: `GET /auth/google` opens in the browser, after success the backend redirects to `cueline://auth?code=...`, the app exchanges the one-time code from Redis for a token pair at `POST /auth/exchange`.
- `modules/user`: `GET /users/me`.
- `AtGuard` global, `@Public()` on open routes. `SubscriptionGuard` as a stub that always passes for now.
- Result: you can register, sign in both ways and get your profile.

### 4. Backend: settings and meetings

- Prisma: `Meeting`, `Segment`, `Generation`, `UsageEvent`.
- `modules/settings`: reading and writing style, default language and profile, cache in Redis.
- `modules/meetings`: create, finish, list, details with transcript and generations. Every query checks the owner.
- `MeetingStateStore` over Redis: window segments, summary, the last reply, locking. The only module that knows the Redis keys. Status later stayed in Postgres only, and the last reply grew into the turn log (task 23).
- `modules/usage`: `UsageRecorder` writes `UsageEvent`.
- Result: through Swagger you can create a meeting, see it in the list and finish it.

### 5. Backend: speech recognition

- `infrastructure/stt`: `SttProvider` with an implementation on the Deepgram live API through a direct WebSocket.
- `modules/stt`: WebSocket `/api/v1/meetings/:id/stt?speaker=me`, authorised with the same access token, one provider connection per client connection.
- Final segments are written to Postgres and to the window in Redis, interim ones are only returned to the client.
- A test with a fake provider.
- Result: a test script with a WAV file gets a transcript, and it is in the meeting details too.

### 6. Backend: context and summary

- `infrastructure/llm`: `LlmProvider` on `openai` with streaming and tokens.
- `modules/context`: `ContextWindow` splits the window by budget, `Summarizer` under a Redis lock compresses the older part and merges it with the previous summary.
- Unit tests on budgets, segment order and the absence of parallel summarization.
- Result: a two-hour meeting keeps its context at a fixed size.

### 7. Backend: reply generation

- `modules/generation`: `POST /api/v1/meetings/:id/generate` with an SSE stream, body `{ mode }`.
- `PromptBuilder`: a stable system block that OpenAI caches as a prefix automatically, then the summary, the segment window, the previous reply, the mode and language instruction. Profile prompts and the default style as data files. The single block later became a conversation with turns (task 23).
- The generation is stored in Postgres, the last reply in Redis, the cost in `UsageRecorder`.
- Tests for `PromptBuilder` and the controller with a fake provider.
- Result: after a transcript, the request returns a reply stream in the right language.

### 8. App: domain and core interfaces

- Domain types mirroring the backend DTOs. Traits: `AudioSource`, `BackendApi`, `SttGateway`, `SecretStore`, `AccessPolicy`.
- A single error type through `thiserror`. IPC contracts in Rust and mirror TS types.
- Result: the core compiles, there are unit tests on serialization.

### 9. App: sign-in, settings, backend client

- `BackendApi` on `reqwest`: a single client, automatic access-token refresh with the refresh token, one error mapping.
- Sign-in: the button opens the browser, the app listens for the deep link `cueline://auth`, exchanges the code for tokens, puts them in Keychain.
- Local settings: backend address, audio devices, hotkeys. User settings are read from the backend.
- `AccessPolicy` with the `AlwaysAllowed` implementation, the `useAccess` hook and a placeholder screen.
- Result: sign-in works, the profile is visible, settings survive a restart.

### 10. App: microphone capture

- `AudioSource` on `cpal`, device choice, conversion to 16 kHz mono i16 through `rubato`, 100 ms frames.
- Volume level in the UI, handling of microphone permission.
- Result: the indicator reacts to the voice.

### 11. App: system audio on macOS

- `AudioSource` in `crates/platform-macos` on ScreenCaptureKit, the same frame format.
- "Screen Recording" permission with instructions in the UI. Both sources work in parallel.
- Fallback plan: a Swift sidecar writing PCM to stdout, without changing the interface. It was not needed.
- Result: two volume indicators, microphone and meeting.

### 12. App: session and live transcript

- Session state: `Idle`, `Starting`, `Listening`, `Stopping`. Start creates the meeting and opens two streams, stop finishes the meeting.
- Reconnection on a drop without losing the meeting.
- The transcript in memory only for display: interim in grey, final in normal text.
- Result: during a meeting you see who says what; after stop the meeting is on the backend.

### 13. App: generation, hotkeys, overlay

- Calling generation, parsing SSE, cancelling the previous request, "reply" and "alternative" modes.
- Global shortcuts from local settings.
- Overlay: on top of everything, frameless, does not take focus, hidden from screen sharing, streaming render and copying. The copy button was later removed (task 19).
- Result: a key pressed in Meet, a reply appeared in the overlay.

### 14. App: main flow and history

- Main window: start/stop, choice of profile and language with defaults from the backend, source and connection statuses, live transcript.
- History: meeting list, transcript and replies of the selected one, cost.
- Errors in human language: not signed in, no permission, backend unavailable.
- Result: the full scenario from sign-in to reply without a console.

### 15. Reliability of both parts

- Backend: scheduled cleanup of expired sessions, provider timeouts, request size limits, finishing "stuck" meetings, e2e tests with fake providers.
- App: `tracing` to a file with rotation, clean shutdown, network retries, a core integration test on recorded audio with a fake backend.

### 16. Build and release

- Backend: Dockerfile, production compose, migrations on deploy.
- App: icon, entitlements, registration of the `cueline://` scheme, signing and notarization.
- Checking on a clean system.

### 18. UI from the mockup

- Theme from the design system's `tokens.json` in `desktop/src/shared/theme/tokens.css`, light and dark.
- Three mockup screens as live components: sign-in (email and password plus Google), main window (profile, language, sources, start, recent meetings), reply overlay.
- The overlay is transparent with blur, its window level is above full-screen apps, global key ⌥R.
- The theme follows the system: the mockup has the light token values, macOS Dark mode gets the dark pairs from the same `tokens.json`.
- No separate onboarding screen: the mockup does not have one, the first screen is sign-in.
- Result: the app looks like the mockup, the state in components is real.

### 19. Overlay: transparent to the mouse, with the full transcript

- By default the overlay does not catch the mouse at all: clicks pass into the app below. A separate hotkey turns on interaction mode, and only in it can the window be dragged, resized and its transcript scrolled.
- No buttons in the overlay: copying is text selection, regeneration stays a hotkey.
- The transcript shows the whole meeting, not the last lines: it sticks to the bottom and scrolls upward in portions.

### 20. Meeting screen and infinite list

- A click on a meeting opens exactly that meeting: on the left a question field to the AI about this meeting, in the centre the transcript and replies, on the right other recent meetings. Task 22 later reshaped this screen.
- The "All" button disappears from the main screen, the meeting list loads in portions as you scroll.
- Backend: `GET /meetings` takes a cursor and a limit.

### 21. Meeting chat

- A new endpoint for asking a meeting a question with a streamed answer; the prompt is built from the transcript and summary.
- Questions and answers are stored next to the meeting, so the chat history is available on the next visit.
- Tokens go through `UsageRecorder`, like reply generation.

### 22. Meeting screen: chats, separate cards, short overview

- No right-hand list of other meetings on the meeting screen. On the left a list of chats about this meeting with search and a "New chat" button, in the centre separate cards for the overview, transcript, replies and cost.
- A click on a chat opens it as a separate screen of the same window, styled as a messenger: the question on the right, the answer on the left, the back arrow leads to the meeting. The chat list stands on the left both where the chat was opened from and in the chat itself; an unwanted chat is deleted from the list row with confirmation in a dialog.
- The overview on screen is at most three sentences about the substance of the meeting, not a retelling of questions and answers. Dense notes stay on the server for the assistant.
- The chat works the meeting with tools (facts, searching and reading the transcript, list of replies), so it knows the duration and who talked how much. The meeting text reaches the model as material in tags, not as instructions.

### 23. Question with a screenshot

- A separate hotkey (`Alt+S` by default) opens a transparent region-selection window over all displays. Esc or right-click cancels, and then nothing happens.
- Capture is done by ScreenCaptureKit inside the app, with the same permission as meeting audio. A child `/usr/sbin/screencapture` does not work: macOS checks the permission against the "responsible" process (in development that is WebStorm), and without it silently returns the desktop without windows.
- The capture is compressed in core to a long side of 1,400 px and JPEG within 400 KB, travels in base64 in the body of `POST /meetings/:id/generate` and reaches the model as a picture next to the transcript.
- The question is taken from the conversation, as for a normal reply: there is no separate text field.
- The prompt became a conversation with turns. The picture lives inside the turn it came with, in the turn log in Redis, so "alternative" and follow-ups see it too, while a new question about something else does not drag it along. The log keeps only the newest picture. Postgres keeps only `hasScreenshot`.

### 24. Projects, renaming and deletion

- A project is a named group of meetings: all rounds of one interview, all calls with one client. A meeting belongs to at most one project.
- Backend: the `projects` table, `Meeting.projectId`, a `projects` module with `GET`, `POST`, `PATCH` and `DELETE`. `GET /meetings` takes `projectId`, where `none` means meetings outside every project. `PATCH /meetings/:id` renames the meeting and moves it between projects, `DELETE /meetings/:id` deletes it with its transcript, replies and chats.
- Deleting a project takes its meetings with it by cascade, so the app asks for confirmation and names the count. While a meeting in the project is live, neither the project nor the meeting itself can be deleted: 409.
- App: a projects bar above the meeting list on the main screen, the "No project" card first. A click on a card narrows the list, dropping a meeting row onto a card moves the meeting, dropping onto "No project" takes it out. Renaming in place, deletion through a dialog.
- Result: meetings from one interview lie together, the unnecessary is deleted, names are fixed without a console.

### 25. Materials for the AI: three levels

- A resource is a standalone user object: PDF, Markdown or pasted text. The level is set by `scope`: `user` (settings), `project` (project description), `meeting` (materials of one call).
- Meeting materials upload **before** the meeting exists: a resource lies with `scope: meeting` and an empty `meetingId`, and `POST /meetings` takes `resourceIds` and claims them right after creating the row. No draft meeting and no new status. Unclaimed ones are removed by `StagedResourcesSweeper` after a day.
- Originals lie in Cloudflare R2 behind the `ObjectStorage` interface; the extracted text and digest are in Postgres, because that is what the prompt reads. Hand-pasted text has no object in R2.
- Text extraction: `unpdf` for PDF, decoding for Markdown and text. A scan without a text layer becomes `failed` with a clear message, there is no OCR. What does not fit the level's budget is compressed once by the summary model into `digest`, and the cost goes to `UsageRecorder` with kind `digest`.
- `ContextBriefBuilder` assembles the three levels into one text: `<about-me>`, `<about-project>`, `<about-meeting>` in that order, fences through the shared `common/untrusted`, a budget per level, and on overflow it cuts from the bottom. The brief freezes at meeting start in `Meeting.contextBrief` and in the Redis state — just like the style, so the system block stays byte for byte the same and the prefix is cached.
- `POST /meetings` also takes `projectId`, because the project level has to be known at start. A project selector appears on the start panel; dragging in history stays as it was.
- App: a "Materials" tab in settings, materials above the meeting list when a project is open, a materials block on the start panel with an "Add file" button and a form for pasted text (no drop zone: native drag-and-drop is off in the main window), the list of used materials on the meeting screen.
- Result: the assistant answers with regard to the user's résumé, the project description and the materials of this very call, and conflicts between them are resolved predictably.

### 17. After the first version

- Subscription: payments, webhooks, `SubscriptionGuard`, limits in Redis, a paywall in the app.
- Stored screenshots in meeting history and memory across meetings as new sources for `PromptBuilder`.
- Vector search over materials, when there are more than fit into the brief.
- Diarization of other participants, local Whisper, Linux and Windows `AudioSource`.
