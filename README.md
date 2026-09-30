# Cueline

Listens to online meetings, creates a live transcript, and prepares a concise reply you can read aloud when you press a hotkey.

- `backend/` — NestJS server that owns product state and provider keys
- `desktop/` — Tauri app that captures audio and displays replies in an overlay
- `docs/PLAN.md` — project scope and tasks in order
- `docs/ARCHITECTURE.md` — modules, API contract, and data model

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
