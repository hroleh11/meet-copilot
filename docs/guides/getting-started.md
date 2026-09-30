# Getting started

How to bring up the backend and the app on your machine and check that everything works.

## Requirements

| Tool                     | Version      | Why                                                              |
| ------------------------ | ------------ | ---------------------------------------------------------------- |
| macOS                    | 13+          | ScreenCaptureKit for meeting audio and screenshots               |
| pnpm                     | 12           | Package manager. It downloads Node 24 by itself via `devEngines` |
| Rust                     | 1.82+ stable | The app core and shell                                           |
| Xcode Command Line Tools |              | Building native macOS code                                       |
| Docker with compose      |              | Postgres and Redis for development                               |

The full flow needs keys: OpenAI, Deepgram, a Google OAuth client and a Cloudflare R2 bucket. Without R2 only file uploads for materials stop working.

## First run

```bash
pnpm install
docker compose up -d
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in at least `AT_SECRET`, `RT_SECRET` (16+ characters), `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`. Every variable is described in [Configuration](configuration.md).

```bash
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate
pnpm --filter backend start:dev
```

In another terminal:

```bash
pnpm --filter desktop tauri dev
```

## Addresses and ports

| What     | Address                                       |
| -------- | --------------------------------------------- |
| API      | `http://localhost:5070/api/v1`                |
| Swagger  | `http://localhost:5070/api/v1/docs`           |
| Health   | `http://localhost:5070/api/v1/health`         |
| Postgres | `localhost:5440`, user and password `cueline` |
| Redis    | `localhost:6390`                              |

The ports are non-standard on purpose, to avoid clashing with other projects on the same machine.

## macOS permissions

On the first meeting macOS asks for:

- **Microphone** — for your voice.
- **Screen Recording** — for meeting audio and screenshots. Both rely on the same ScreenCaptureKit permission.

During development the permission is granted to the process that launched `tauri dev`, such as your terminal or IDE.

## Checks

Before a change counts as done, everything relevant to the part you touched must pass:

```bash
pnpm lint
pnpm typecheck
pnpm test

cd desktop
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

What the tests cover:

| Where                        | Tool             | What is checked                                                                                   |
| ---------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| `backend/src/**/*.spec.ts`   | Jest             | Unit tests for services, the prompt builder, the context window, Deepgram result parsing          |
| `backend/test/*.e2e-spec.ts` | Jest + supertest | Full scenarios with fake providers: auth, STT, generation, chat, materials, reliability           |
| `desktop/crates/core/tests`  | cargo test       | Session lifecycle, generation, transport retries, the backend wire contract, a recorded-audio run |
| `desktop/src/**/*.test.tsx`  | Vitest           | Components, hooks, stores                                                                         |

## Useful commands

```bash
pnpm --filter backend prisma:migrate     create and apply a migration
pnpm --filter backend prisma:studio      browse the database
pnpm --filter backend test:e2e           backend e2e tests
pnpm format                              prettier across the repo
docker compose down -v                   drop the databases with their data
```

## Common problems

| Symptom                                            | Cause and fix                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Backend exits with `Environment validation failed` | A required variable is missing. The message names it                                                     |
| Transcript shows only "me", never "others"         | No Screen Recording permission. Clicking the source row opens the right pane                             |
| Screenshot says there is no permission             | The same Screen Recording permission                                                                     |
| Keychain asks for a password in a debug build      | It should not: debug keeps tokens in a `0600` file because the ad-hoc signature changes with every build |
| The overlay is missing from a screenshot           | By design: it is excluded from screen capture                                                            |
| Audio in Bluetooth headphones sounds like a phone  | A Bluetooth microphone is selected. Pick the built-in one or leave the choice automatic                  |

App logs: `~/Library/Logs/com.cueline.app/cueline.<date>.log`.

Next: [Architecture overview](../architecture/overview.md).
