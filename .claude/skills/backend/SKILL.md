---
name: backend
description: Conventions for the NestJS backend of Meet Copilot (backend/): module layout, repository pattern, Prisma and Redis, auth guards, Swagger DTOs, the Deepgram speech stream, context and summarization, OpenAI generation over SSE. Load before writing or changing anything under backend/ or docker-compose.yml.
---

# Backend conventions

These are carried over from the user's reference project and must stay consistent.

## Layout

```
backend/prisma/             schema.prisma, migrations
backend/src
  main.ts                   bootstrap: global prefix, ValidationPipe, Swagger
  app.module.ts             ConfigModule.forRoot({ validate: validateEnv }), Throttler, APP_GUARD chain
  common/
    config/                 env.schema.ts (zod) + index.ts
    decorators/             public, current-user, current-user-id, refresh-session
    dto/                    common.responses.ts
    filters/                all-exceptions.filter.ts
    guards/                 at.guard.ts, rt.guard.ts, google.guard.ts, subscription.guard.ts
    middleware/             request-id.middleware.ts
    types/                  auth.types.ts, express.d.ts
  infrastructure/           prisma, redis, hashing, llm, stt
  modules/                  auth, user, settings, projects, meetings, stt, context, generation, chat, usage, health
```

## Module rules

- A module lives in `src/modules/<name>/` and exposes its public surface through `index.ts`. Never deep-import another module's files: `~/modules/user`, not `~/modules/user/user.repository`.
- Files: `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.repository.ts`, plus `dto/`, `types/`, `constants/`, `prompts/` when needed.
- **All Prisma queries live in the repository.** Services hold business rules and call repositories; a service never injects `PrismaService`.
- Inside a module import relatively (`./auth.service`); across modules import through the alias (`~/modules/user`). Never mix the two for the same module.
- Infrastructure modules are `@Global()` so they need no re-import.

## Imports and aliases

- Path alias `~/*` → `src/*` in `tsconfig.json`. Always import via `~/...`, never `../../..`.
- The Prisma client is generated into `src/generated/prisma`. Import from `~/generated/prisma/client` and `~/generated/prisma/enums`, never `@prisma/client`. `src/generated` is git-ignored.

## Config

- One zod schema in `common/config/env.schema.ts` exporting `Env` and `validateEnv`. Wired through `ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv })`.
- Inject as `ConfigService<Env, true>` and read with `getOrThrow<T>`; without the type argument the value is `any` and ESLint rejects it.
- Every new variable goes into the schema and into `.env.example`, not just `.env`.
- Keys: `NODE_ENV`, `PORT`, `API_PREFIX`, `DESKTOP_REDIRECT_URL`, `DATABASE_URL`, `REDIS_URL`, `AT_SECRET`, `RT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `REPLY_MODEL`, `REPLY_EFFORT`, `SUMMARY_MODEL`, `SUMMARY_EFFORT`, `WINDOW_MAX_CHARS`, `SUMMARY_TRIGGER_CHARS`, `FINISHED_MEETING_TTL_SECONDS`.

## Auth

- There is no web client. The desktop app is the only consumer, so there are no cookies, no CSRF and no CORS: tokens travel in request bodies and the `Authorization: Bearer` header.
- `AtGuard` (passport `jwt`) is global via `APP_GUARD`; `@Public()` opts a route out. `SubscriptionGuard` runs after it and in the first version lets everyone through. It exists so the subscription check has exactly one home later.
- Refresh tokens are hashed with argon2 and stored per session in `auth_sessions`, one row per device. The session id rides in both tokens. Replaying a rotated refresh token deletes the session rather than issuing new ones.
- Google sign-in opens the system browser; the callback redirects to `meetcopilot://auth?code=...` with a one-time code held in Redis for 60 seconds and consumed on exchange. Never an embedded webview, per RFC 8252.
- Login must never reveal whether an account exists: an unknown email and a wrong password return the identical error. Registration answers 409 on a taken email, which does reveal it; that stays until email verification exists.

## DTOs and Swagger

- Request DTOs use `class-validator` in `dto/*.dto.ts`. Response DTOs use `@ApiProperty` in `dto/*.responses.ts`. Keep them in separate files.
- Response classes are named `<Thing>Response`. Controllers declare `@ApiTags`, `@ApiOperation` and `@ApiOkResponse({ type })`.
- The global `ValidationPipe` runs with `whitelist`, `transform`, `forbidNonWhitelisted`.

## Storage

- `PrismaService extends PrismaClient` using `@prisma/adapter-pg` with `DATABASE_URL`.
- Prisma models use camelCase fields with `@map` to snake_case columns and `@@map` to plural table names. Ids are `uuid`. Enum values are spelled exactly as they appear on the wire (`uk`, `daily`, `interview_candidate`), so no mapping layer is needed anywhere.
- `RedisService` wraps one ioredis client with typed helpers and closes on shutdown. Raw client access stays inside `infrastructure/redis`.
- Redis holds only what can be rebuilt from Postgres, plus short-lived codes. `MeetingStateStore` owns the `meeting:{id}:*` keys and exposes intent-named methods. Use `MULTI` when two keys must change together.

## STT (Deepgram)

- The speech stream is a raw `ws` server attached to the Nest HTTP server's `upgrade` event, not a Nest gateway. Nest's WsAdapter expects a JSON `event`/`data` envelope, which raw PCM frames do not have, and it cannot carry the meeting id as a path parameter.
- Path `/{prefix}/meetings/{uuid}/stt?token=...&speaker=me|other`. Rejections complete the handshake and then close with 4401 (bad token) or 4404 (meeting missing, finished, or bad speaker), so the client reads a real close code instead of a failed handshake.
- Deepgram is reached over a plain `ws` connection, not `@deepgram/sdk`. The v5 SDK's `listen.v1.connect` returns an already-closed socket in every configuration tried, while the documented endpoint works: `wss://api.deepgram.com/v1/listen` with the settings as query parameters and `Authorization: Token <key>` as a header. Control messages are JSON: `{"type":"KeepAlive"}` every 8 s and `{"type":"CloseStream"}` to finish.
- Closing must send `CloseStream` and then wait for Deepgram to close the socket itself, with a short timeout as a backstop. Deepgram only emits the last segment of a meeting on that flush, so hanging up immediately loses it. `SttStream.close()` is therefore async and the connection awaits it before recording usage.
- The connection registers its socket message handler before opening the provider stream and queues frames until the stream exists, so no audio is lost during the handshake.
- The client ends a lane with the text message `{"type":"finish"}`, never by dropping the socket: the flushed tail arrives after that request, so a socket that is already gone cannot receive it. The connection closes the provider stream, awaits the queued results, and only then closes the socket with 1000.
- Results are handled through a promise chain rather than fire and forget, so segments keep their arrival order and the flush can be awaited before the socket closes.
- The provider's own close is ignored once the connection is finishing. Deepgram closes its socket as part of the flush, and closing the client with 4500 there would drop the very segments the flush produced.
- Final segments are written to Postgres and the Redis window, then `Summarizer.maybeRun` is called without awaiting. Interim results only go back to the client. Empty transcripts are dropped.
- Usage with audio seconds is recorded on close, counted as received bytes over 32000.

## Context and summarization

- `ContextWindow.read(meetingId)` splits the Redis window into `recent` and `stale` by a character budget alone. Ordering comes from the Redis list, which is arrival order across both speaker lanes; segment `startMs` is per lane and resets on reconnect, so it must never be used to order or age the window.
- The newest segment is never staled, even when it alone exceeds the budget, so a long monologue cannot empty the live context.
- `Summarizer.maybeRun(meetingId, userId)` returns early unless `stale` passes `SUMMARY_TRIGGER_CHARS` and the Redis lock is claimed. It summarizes with the summary model, merges with the previous notes, writes the result to Redis and `Meeting.summary`, trims the window to the recent segments, records usage and releases the lock in a `finally`. Failures log and release; the next final segment retries.
- Summaries are written in the meeting language as dense factual prose: topics, decisions, open questions.

## Generation (OpenAI)

The provider is the `openai` SDK's Responses API, behind the `LlmProvider` interface so the rest of the code never sees it.

```ts
const response = await this.client.responses.create({
  model,
  instructions: system,
  input: blocks.join('\n\n'),
  reasoning: { effort },
  max_output_tokens: maxTokens,
});
// response.output_text, response.status, response.incomplete_details?.reason
// response.usage.input_tokens / .input_tokens_details.cached_tokens / .output_tokens
```

- Model ids and effort come from config; never hardcoded. `REPLY_MODEL` is `gpt-5.2` and `SUMMARY_MODEL` is `gpt-5-mini` by default, both at `low` effort, because a hotkey reply is judged on latency and a summary is an easy task.
- Effort levels are `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. Raise it only with a measured reason.
- Prompt caching is automatic on prefixes above roughly a thousand tokens, so there is no `cache_control` to place. What still matters is prefix stability: the system text must stay byte-identical for the whole meeting, and everything volatile goes into the input blocks after it. `usage.input_tokens_details.cached_tokens` is the only signal that it is working.
- Usage is recorded as `inputTokens`, `cachedInputTokens` and `outputTokens`. There is no separate cache-write charge, so there is no fourth counter.
- Reasoning models spend output tokens on thinking before the visible answer, so `max_output_tokens` has to leave room for both. A reply that comes back with `incomplete_details.reason === 'max_output_tokens'` means the budget was too tight, not that the model failed.
- Catch the SDK's typed errors most-specific first: `AuthenticationError` and `APIConnectionError` map to 502, `RateLimitError` to 429, any other `APIError` to 502. Never string-match messages.
- Client disconnect aborts the provider stream through `AbortSignal`; the partial output is still saved with the cancelled stop reason.
- `stream` takes `LlmStreamRequest`, a list of `LlmMessage` with roles, while `complete` keeps the one-shot `blocks` shape for the summarizer and the overview writer. `toStreamInput` maps a message to an `EasyInputMessage`, or to a `user` item with `input_text` plus `input_image` when it carries a picture.
- A request may carry `screenshot` (`{ mimeType, dataBase64 }`, jpeg or png). It is stored inside the conversation turn it arrived with, so follow-ups see it and a new subject sees it behind them instead of attached to their own question. There is no screenshot TTL. Postgres keeps only `Generation.hasScreenshot`, which is true whenever any message in the request carried a picture.

## Projects, renaming and deleting

- `modules/projects` owns the groups a user makes by hand. It knows nothing about meetings beyond the relation, so `MeetingsModule` imports it and never the other way round: assigning a meeting asks `ProjectsService.requireOwned` for the project, which is what turns somebody else's project into a 404.
- `Meeting.projectId` is nullable and the relation cascades: deleting a project deletes the meetings in it. That is the product decision, so the desktop names the number of meetings in the confirmation dialog.
- A meeting that is still `live` is neither deleted nor deleted along with its project: both answer 409. A row being written by the speech stream cannot be pulled out from under it, and finished meetings already carry a TTL on their Redis keys, so deleting one needs no cleanup there.
- `PATCH /meetings/:id` carries `title?` and `projectId?`, where `projectId: null` takes the meeting out of its project. `null` and «absent» differ, so the DTO uses `@ValidateIf((_, value) => value !== null)` beside `@IsOptional()` and the service branches on `undefined`, never on falsiness.
- `GET /meetings` filters with `projectId`, and the literal `none` (exported as `MEETINGS_OUTSIDE_PROJECTS`) means the meetings in no project at all. The repository takes `projectId?: string | null` — `undefined` for every meeting, `null` for the ones outside.

## Materials and the context brief

- `modules/resources` owns the three levels a material can belong to: `user`, `project`, `meeting`. A material is a user's own object, not part of a meeting, which is what lets it be uploaded before the meeting exists: a meeting material with no `meetingId` is staged, and `POST /meetings` claims the ids it is given in the same call that creates the row. There is no draft meeting and no new `MeetingStatus`.
- `ResourcesModule` imports `ProjectsModule`, never `MeetingsModule`; `MeetingsModule` imports `ResourcesModule`. Listing by `meetingId` filters by `userId` too, so ownership needs no call back into meetings and the cycle never appears.
- Upload answers with a `pending` row and `ResourceIngestor` runs behind it: read the text, store the original, compress what does not fit its level, mark it `ready` or `failed`. The desktop follows `GET /resources/:id` until it settles. Pasted text has no object in storage and is ready at once.
- A failure is stored as `ResourceFailure` (`unreadable`, `no_text_layer`, `storage`), never as a sentence: the desktop is what speaks Ukrainian. Each step of the ingest fails as itself, so a bucket that cannot be reached does not read as a document that cannot be parsed — which is exactly how an unconfigured R2 first showed up.
- `GET /resources/:id/content` is what the desktop shows a person: the extracted text plus the digest, so «what did it actually read» has an answer. `GET /resources/limits` publishes `RESOURCE_MAX_BYTES` (10 MB) and `RESOURCE_TEXT_MAX_CHARS` (1 000), and it is declared before `@Get(':id')` so the literal path wins over the uuid parameter. Pasted text over the limit is refused with 413 rather than silently cut. Text extracted out of a file is capped by a separate `RESOURCE_EXTRACTED_MAX_CHARS`, because one knob for both would cut a document down to the size of a text field and then digest the stump.
- The name of an upload travels as its own form field. A multipart `filename` is decoded latin-1 by busboy, so a Cyrillic name comes back as mojibake; a field value is utf-8.
- `ObjectStorage` (`infrastructure/storage`) is Cloudflare R2 behind `put` and `delete`. Only original bytes live there; every byte the prompt reads is in Postgres, so a live meeting never touches the bucket. Uploads go through Nest as multipart with the limit from `RESOURCE_MAX_BYTES` via `MulterModule`; `MAX_REQUEST_BODY_BYTES` stays the JSON limit.
- `ResourceExtractor` reads PDFs with `unpdf` and decodes Markdown and text. A PDF with no text layer extracts to nothing, which is `failed` with a message about a scan; there is no OCR. `ResourceDigester` compresses what exceeds the level budget once per material with the summary model and records usage as `digest`.
- `ContextBriefBuilder` renders `<about-me>`, `<about-project>`, `<about-meeting>` in that order inside `<materials>`, fenced through `common/untrusted`. The order is the priority rule, the persona states it in words, and the shared budget is filled meeting first, so running out drops the user level rather than this call.
- The brief is frozen at start into `Meeting.contextBrief` and the Redis state hash, next to the style and for the same reason: the system text must stay byte-identical for the whole meeting. The chat about a finished meeting reads that same frozen text from Postgres.
- No embeddings. A résumé, a job description and a project brief are a few thousand tokens that fit whole, and retrieving chunks per request would make the prefix different every time and lose the cache. The place for retrieval later is the chat's tool loop, not the live reply.

## Chat about a finished meeting

- `modules/chat` answers questions about a meeting that already ended. Its context comes from Postgres through `MeetingsService`, never from Redis: the live state is gone by then.
- A meeting holds any number of chats (`chat_sessions`), each with its own messages. A chat takes its name from the first question asked in it and never renames itself. Listing them accepts a `query` that matches the name or anything said inside the chat.
- The model is not handed a fixed extract: `ChatAgent` runs a tool loop over `MeetingToolbox` (`meeting_facts`, `search_transcript`, `read_transcript`, `list_answers`), at most six turns. That is why a question about how long the meeting ran has an answer. A short transcript still travels inline; a long one is announced and read through the tools.
- Tool turns continue through `previous_response_id` (`continueFrom` on `LlmAgentRequest`), so the provider keeps its own reasoning and only tool results are sent back. Usage from every turn is summed and recorded once with kind `chat`.
- Everything the meeting produced reaches the model fenced in `<notes>`, `<facts>`, `<transcript>`, `<question>` or a tool result, and the persona says that is material, never instructions. `chat/untrusted.ts` strips those tags out of the content so a line from the transcript cannot close the fence and speak as us.
- Each exchange is stored in `chat_messages` as one row with the question and the answer, so history survives and the desktop can show it on the next open.
- The SSE writer is shared: `common/sse` opens the stream and writes events. A feature's `done` payload is its own, so the desktop reads frames generically and decodes `done` per feature.

## The overview of a meeting

- `Meeting.summary` is the dense running notes the copilot answers from. `Meeting.overview` is what a person reads: at most three sentences on what the meeting was about, no walk-through of questions and answers.
- `MeetingOverviewWriter` lives in the meetings module, because it needs nothing from `context/` and the context module already imports meetings. It writes once, with the summary model, after the meeting is finished: `finish` starts it in the background and `GET /meetings/:id` awaits it when the text is still missing. A run already in flight is shared, so two readers never pay twice.
- Meeting details expose `overview` only. The notes stay on the server.

## PromptBuilder

- Input comes from `MeetingStateStore` and `ContextWindow`. Output is `{ system, messages }`.
- The request is a conversation, not one block: a turn is what was spoken since the previous draft (`user`) and the draft we gave for it (`assistant`). Messages in order: notes, past turns, then what has been said since plus the mode instruction. The question being asked is always the last message.
- That structure is the whole point. Flattened into a single `user` message, a screenshot sent two questions ago arrives *together with* the current question, and the model ties them — correctly, given what it was shown. Two rounds of prompt wording failed to fix it; roles did. Never fold history back into one message.
- System text = persona + profile prompt + style + language instruction. Nothing that varies per request, so the cached prefix stays byte-identical across a meeting and history only ever appends.
- `spokenUpTo` in the meeting state hash is the id of the newest segment the model has seen; `segmentsAfter` cuts the new turn at it, falling back to the whole window when the summarizer has trimmed the marker away.
- `alternative` rewrites the last turn's answer instead of appending a turn, so retries do not pile up in history. The turn log keeps the last six turns and only the newest screenshot among them, and the builder drops history pictures when this request brings its own, so a request never carries more than one image.
- Persona, profile prompts and the default style live in `modules/generation/prompts/*.ts` as exported constants, one file per profile. Tune wording there, not in the builder.
- Reply constraints in the persona: spoken style, first person, readable aloud in 15 seconds, no headings or lists, no preamble. Answer in the meeting language regardless of the transcript language.

## Style

- Prettier: single quotes, width 90, trailing commas, two spaces. ESLint with type-checked rules; `no-floating-promises` and `no-explicit-any` are errors, not warnings.
- TypeScript runs with full `strict`. No `any`, no non-null assertions outside tests.
- No commented-out code and no TODO placeholders left behind. If something is not implemented yet, it is not in the file.

## Testing

- Unit specs next to the code as `*.spec.ts`: `PromptBuilder` table-driven over profiles and modes, `ContextWindow` budgets, `Summarizer` with fakes, guards, DTO validation, provider mappers.
- e2e under `test/` share `AppHarness`, which boots the real `AppModule` against the compose Postgres and Redis, signs up throwaway accounts and deletes them on shutdown, so `docker compose up -d` must be running. Specs that do not need a store bind fakes through a `@Global()` test module instead.
- The e2e runner needs `node --experimental-vm-modules` because the generated Prisma client loads its query compiler through a dynamic import. Provider access is always faked with `FakeLlmProvider` and `FakeSttProvider`; no test calls a real provider.

## Checks

```
pnpm --filter backend lint
pnpm --filter backend typecheck
pnpm --filter backend test
pnpm --filter backend test:e2e
```
