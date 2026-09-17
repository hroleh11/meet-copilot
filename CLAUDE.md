# Meet Copilot

Monorepo with two parts. `backend/` is a NestJS server that owns all product state: users, meetings, transcripts, summaries, settings, prompts, provider keys. It does speech recognition (Deepgram) and reply generation (Anthropic). `desktop/` is a thin Tauri app: it captures audio, streams it to the backend, shows the live transcript, and on a global hotkey asks for a reply and shows it in an overlay. The desktop never talks to providers and has no local database.

Read `docs/PLAN.md` for scope and ordered tasks, `docs/ARCHITECTURE.md` for module layout, the API contract, data model, types and traits. Follow them; if a decision there turns out wrong, change the doc in the same change as the code.

## Stack

- Root: pnpm workspace with `desktop` and `backend`; `docker-compose.yml` runs Postgres and Redis for development.
- Backend: NestJS 11, TypeScript strict, Prisma 7 with `@prisma/adapter-pg`, PostgreSQL, ioredis, passport JWT and Google OAuth, argon2, zod for env, Swagger, Jest.
- Desktop: Tauri 2, Rust 2021, cargo workspace `crates/core`, `crates/platform-macos`, `src-tauri`. React 19, TypeScript strict, Vite, Tailwind, zustand, Vitest. Audio: `cpal`, `rubato`. Secrets: `keyring`. Backend client: `reqwest`, `tokio-tungstenite`.

## Commands

```
docker compose up -d                    postgres + redis
pnpm --filter backend prisma:migrate    create and apply a migration
pnpm --filter backend start:dev         run the backend
pnpm --filter desktop tauri dev         run the app
pnpm lint                               eslint, both packages
pnpm typecheck                          tsc --noEmit, both packages
pnpm test                               jest + vitest, both packages
cd desktop && cargo clippy --workspace --all-targets -- -D warnings
cd desktop && cargo test --workspace
cd desktop && cargo fmt --all
```

Everything relevant to the part you touched must pass before a task is considered done.

## Code rules

- No comments. Names and structure carry the meaning. The only exception is a non-obvious workaround for a platform or library bug, one line, stating the bug.
- No commented-out code, no TODO placeholders, no dead constants. If something is not implemented yet, it is not in the file.
- Files stay under roughly 200 lines. Split by responsibility, never by line count alone.
- One concept per file, one public entry point per module. Prefer many small modules over one large one.
- Provider keys exist only in the backend `.env`. They never appear in source, desktop config, or any binary.
- Install dependencies with the official tooling (`nest g`, `create-tauri-app`, `prisma init`) rather than hand-editing manifests, and pin exact versions afterwards. Add a dependency only when it removes real code.
- Path alias `~` maps to the package source root in both packages. Always import through it, never with `../..` chains.

### Backend

- Module layout, repository pattern, guards, DTO and Swagger conventions are in `.claude/skills/backend/SKILL.md`. Read it before touching `backend/`.
- All Prisma queries live in repositories; services never inject `PrismaService`. Modules import each other only through `index.ts`.
- Every route except the public ones goes through `AtGuard` then `SubscriptionGuard`; nothing else reads auth headers or cookies. Every meeting query filters by `userId`. Usage is reported only through `UsageRecorder`. Redis keys for meetings are known only to `MeetingStateStore`.
- Full TypeScript `strict`. No `any`. Errors surface as Nest `HttpException` subclasses at the controller boundary.

### Desktop

- `crates/core` must not depend on Tauri or any OS-specific crate. Everything external sits behind a trait defined in core. All backend calls go through `BackendApi`. Subscription state is checked only through `AccessPolicy` at session start and generation.
- Errors: `thiserror` enums in core, `anyhow` only at the Tauri boundary. Never `unwrap` outside tests.
- Async: tokio. Streams via `futures::Stream`, channels via `tokio::sync::mpsc`.
- IPC contracts live in `desktop/src-tauri/src/events.rs` and `desktop/src/shared/ipc`. Change both together.
- Frontend: feature folders under `src/features`, shared pieces under `src/shared`. Function components, hooks for logic, zustand for cross-feature state. No default exports except where a framework requires them.

## Working style

- Do one task from `docs/PLAN.md` at a time, in order. Finish it fully, run the checks, then stop.
- Before adding a module, check the layout in `docs/ARCHITECTURE.md` and put it where it belongs.
- Skills in `.claude/skills` hold the conventions for the backend, the Rust core and the frontend. Read the relevant one before touching that area.
- The user reads Ukrainian; write user-facing UI text and docs in Ukrainian, code and identifiers in English.
