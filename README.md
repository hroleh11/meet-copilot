# Cueline

Listens to online meetings, creates a live transcript, and prepares a concise reply you can read aloud when you press a hotkey.

- `backend/` — NestJS server that owns product state and provider keys
- `desktop/` — Tauri app that captures audio and displays replies in an overlay
- `docs/` — documentation: product, guides, architecture, API, decisions

## Documentation

Start at [`docs/README.md`](docs/README.md).

- [Product overview](docs/product/overview.md) and [features](docs/product/features.md)
- [Getting started](docs/guides/getting-started.md) and [configuration](docs/guides/configuration.md)
- [Architecture overview](docs/architecture/overview.md) and [a live meeting end to end](docs/architecture/live-meeting.md)
- [Backend](docs/backend/README.md), [API reference](docs/backend/api.md), [data model](docs/backend/data-model.md), [AI pipeline](docs/backend/ai-pipeline.md)
- [Desktop app](docs/desktop/README.md), [IPC](docs/desktop/ipc.md), [windows and UI](docs/desktop/windows-and-ui.md)
- [Technical decisions (ADR)](docs/decisions/README.md)
- Working specs: [`docs/PLAN.md`](docs/PLAN.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/RELEASE.md`](docs/RELEASE.md)

## Requirements

- Node is managed automatically: pnpm uses the version specified in `devEngines` in `package.json`, so a system-wide Node installation is not required
- pnpm 12, Rust 1.82+, Xcode Command Line Tools, and Docker

## Getting Started

```bash
pnpm install
docker compose up -d
cp backend/.env.example backend/.env
pnpm --filter backend prisma:generate
pnpm --filter backend start:dev
pnpm --filter desktop tauri dev
```

The backend is available at `http://localhost:5070/api/v1`, with Swagger at `/api/v1/docs`. Postgres uses port 5440 and Redis uses port 6390. These non-standard ports are intentional to avoid conflicts with other projects.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
cd desktop && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace
```
