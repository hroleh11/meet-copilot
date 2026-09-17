---
name: backend
description: Conventions for the NestJS backend of Meet Copilot (backend/): module layout, repository pattern, Prisma and Redis, auth guards, Swagger DTOs, STT gateway, context and summarization, Anthropic generation with prompt caching and SSE. Load before writing or changing anything under backend/ or docker-compose.yml.
---

# Backend conventions

These are carried over from the user's reference project and must stay consistent.

## Layout

```
backend/prisma/             schema.prisma, migrations
backend/src
  main.ts                   bootstrap: cookie-parser, global prefix, ValidationPipe, CORS, Swagger
  app.module.ts             ConfigModule.forRoot({ validate: validateEnv }), Throttler, APP_GUARD chain
  common/
    config/                 env.schema.ts (zod) + index.ts
    decorators/             public.decorator.ts, current-user-id.decorator.ts, current-user.decorator.ts
    dto/                    common.responses.ts
    filters/                all-exceptions.filter.ts
    guards/                 at.guard.ts, rt.guard.ts, google.guard.ts, subscription.guard.ts
    types/                  express.d.ts
  infrastructure/           prisma, redis, hashing, llm, stt
  modules/                  auth, user, settings, meetings, stt, context, generation, usage, health
```

## Module rules

- A module lives in `src/modules/<name>/` and exposes its public surface through `index.ts`. Never deep-import another module's files: `~/modules/user`, not `~/modules/user/user.repository`.
- Files: `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.repository.ts`, plus `dto/`, `types/`, `constants/` when needed.
- **All Prisma queries live in the repository.** Services hold business rules and call repositories; a service never injects `PrismaService`.
- Inside a module import relatively (`./auth.service`); across modules import through the alias (`~/modules/user`). Never mix the two for the same module.
- Infrastructure modules are `@Global()` so they need no re-import.

## Imports and aliases

- Path alias `~/*` → `src/*` in `tsconfig.json`. Always import via `~/...`, never `../../..`.
- The Prisma client is generated into `src/generated/prisma`. Import from `~/generated/prisma/client` and `~/generated/prisma/enums`, never `@prisma/client`. `src/generated` is git-ignored.

## Config

- One zod schema in `common/config/env.schema.ts` exporting `Env` and `validateEnv`. Wired through `ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv })`.
- Inject as `ConfigService<Env, true>` and read with `getOrThrow`.
- Every new variable goes into the schema and into `.env.example`, not just `.env`.
- Keys: `PORT`, `NODE_ENV`, `API_PREFIX`, `FRONTEND_URL`, `DESKTOP_REDIRECT_URL`, `DATABASE_URL`, `REDIS_URL`, `AT_SECRET`, `RT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `REPLY_MODEL`, `SUMMARY_MODEL`, `REPLY_EFFORT`, `SUMMARY_EFFORT`, plus context budgets.

## Auth

- `AtGuard` (passport `jwt`) is global via `APP_GUARD`; `@Public()` opts a route out. `SubscriptionGuard` runs after it and in the first version lets everyone through.
- The access-token strategy accepts the `accessToken` cookie first, then a Bearer header, so web and desktop share one guard.
- Refresh tokens are hashed with argon2 and stored in `UserCredentials.hashedRt`. Web gets httpOnly cookies from `CookiesService`; desktop gets tokens in the body.
- Desktop login never shows a password form inside the app: it opens the system browser, and the backend redirects to `meetcopilot://auth?code=...` with a one-time code held in Redis for 60 seconds and consumed on exchange.
- Login must never reveal whether an account exists: an unknown email and a wrong password return the identical error. Registration answers 409 on a taken email, which does reveal it; that stays until email verification exists, and then registration becomes a generic response too.

## DTOs and Swagger

- Request DTOs use `class-validator` in `dto/*.dto.ts`. Response DTOs use `@ApiProperty` in `dto/*.responses.ts`. Keep them in separate files.
- Response classes are named `<Thing>Response`. Controllers declare `@ApiTags`, `@ApiOperation` and `@ApiOkResponse({ type })`.
- The global `ValidationPipe` runs with `whitelist`, `transform`, `forbidNonWhitelisted`.

## Storage

- `PrismaService extends PrismaClient` using `@prisma/adapter-pg` with `DATABASE_URL`.
- Prisma models use camelCase fields with `@map` to snake_case columns and `@@map` to plural table names. Ids are `uuid`. Enums are Prisma enums: `Speaker`, `Language`, `MeetingProfile`, `GenerationMode`, `MeetingStatus`, `UsageKind`.
- `RedisService` wraps one ioredis client with typed helpers and closes on shutdown. Raw client access stays inside `infrastructure/redis`.
- Redis holds only what can be rebuilt from Postgres, plus short-lived codes. `MeetingStateStore` owns the `meeting:{id}:*` keys and exposes intent-named methods. Use `MULTI` when two keys must change together.

## STT (Deepgram)

- Gateway path `/meetings/:id/stt`, one connection object per socket, `speaker` validated on connect, language taken from the meeting.
- `DeepgramSttProvider` opens a live connection per socket: `nova-3`, `linear16`, 16000 Hz, mono, `interim_results`, `smart_format`, `endpointing: 300`.
- Client binary frames go straight to the provider. Final segments are written to Postgres and the Redis window, then `Summarizer.maybeRun` is called without awaiting. Empty transcripts are dropped.
- Keep-alive every 8 s while idle. Either side closing closes the other. Usage with audio seconds recorded on close.

## Context and summarization

- `ContextWindow.read(meetingId)` splits the Redis window into `recent` and `stale` by minutes and characters from config.
- `Summarizer.maybeRun` returns early unless `stale` passes the threshold and the Redis lock is acquired. It summarizes with the summary model, merges with the previous summary, trims the window, updates `Meeting.summary`, records usage, releases the lock. Failures log and release; the next segment retries.
- Summaries are written in the meeting language as a dense factual paragraph: topics, decisions, open questions.

## Generation (Anthropic)

```ts
const stream = client.messages.stream(
  {
    model,
    max_tokens: 1024,
    output_config: { effort },
    system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userBlocks }],
  },
  { signal },
);
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    yield { type: 'delta', text: event.delta.text };
  }
}
const final = await stream.finalMessage();
yield { type: 'done', stopReason: final.stop_reason, usage: final.usage };
```

- Model ids and effort come from config; never hardcoded, never with date suffixes.
- Do not send `thinking`, `temperature`, `top_p` or `top_k`: adaptive thinking is the default on Opus 5 and sampling params are rejected. No assistant prefill.
- `max_tokens`: 1024 for replies, 4096 for summaries.
- `stop_reason === 'refusal'` becomes an `error` event, no retry. `max_tokens` sends `done` with that reason.
- Catch the SDK's typed errors most-specific first: `AuthenticationError` → 502, `RateLimitError` → 429, `APIConnectionError` and 5xx `APIError` → 502. Never string-match messages.
- Client disconnect aborts the provider stream through `AbortSignal`; the partial output is still saved with `stopReason: 'cancelled'`.

## PromptBuilder

- Input comes from `MeetingStateStore` and `ContextWindow`. Output is `{ system, userBlocks }`.
- System text = persona + profile prompt + style. Nothing that varies per request, so the cache prefix stays byte-identical across a meeting.
- User blocks in order: summary, recent segments as `[me] ...` / `[other] ...`, previous answer for alternative mode, mode instruction, language instruction.
- Persona, profile prompts and the default style live in `modules/generation/prompts/*.ts` as exported constants, one file per profile. Tune wording there, not in the builder.

## Style

- Prettier: single quotes, width 90, trailing commas, two spaces. ESLint with type-checked rules; `no-floating-promises` and `no-explicit-any` are errors, not warnings.
- TypeScript runs with full `strict`. No `any`, no non-null assertions outside tests.
- No commented-out code and no TODO placeholders left behind. If something is not implemented yet, it is not in the file.

## Testing

- Unit specs next to the code as `*.spec.ts`: `PromptBuilder` table-driven over profiles and modes, `ContextWindow`, `Summarizer` with fakes, guards, DTO validation.
- e2e under `test/`. Auth specs boot the real `AppModule` against the compose Postgres and Redis, so `docker compose up -d` must be running; they generate unique emails and clean up in `afterAll`. Specs that do not need a store bind fakes through a `@Global()` test module instead.
- The e2e runner needs `node --experimental-vm-modules` because the generated Prisma client loads its query compiler through a dynamic import. Provider access is always faked with `FakeLlmProvider` and `FakeSttProvider`; no test calls a real provider.

## Checks

```
pnpm --filter backend lint
pnpm --filter backend typecheck
pnpm --filter backend test
```
