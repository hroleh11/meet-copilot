# Cueline documentation

Cueline is an assistant for online meetings. It listens to the conversation, keeps a live transcript, and on a hotkey suggests a short reply you can read aloud. The reply appears in a transparent overlay above every window, and the overlay is invisible when you share your screen.

The documentation is split by who reads it and why.

## Where to start

| I want to…                          | Read                                              |
| ----------------------------------- | ------------------------------------------------- |
| Understand what the product is      | [Product overview](product/overview.md)           |
| Learn what the app can do           | [Features](product/features.md)                   |
| Run everything locally              | [Getting started](guides/getting-started.md)      |
| Understand how the system is built  | [Architecture overview](architecture/overview.md) |
| Understand why it is built this way | [Technical decisions](decisions/README.md)        |

## Contents

### Product

- [Product overview](product/overview.md) — who it is for, the problem it solves, the main flow, glossary
- [Features](product/features.md) — every first-version feature, profiles, hotkeys, limits

### Guides

- [Getting started](guides/getting-started.md) — requirements, local setup, checks, common problems
- [Configuration](guides/configuration.md) — backend environment variables and local app settings
- [Build and release](RELEASE.md) — production backend deploy, app signing and notarization

### Architecture

- [Architecture overview](architecture/overview.md) — components, principles, boundaries of responsibility
- [A live meeting end to end](architecture/live-meeting.md) — the full data flow with diagrams
- [Security and access](architecture/security.md) — authentication, secrets, subscription, privacy

### Backend (`backend/`)

- [Backend structure](backend/README.md) — layers, modules, code conventions
- [API reference](backend/api.md) — REST, WebSocket and SSE routes
- [Data model](backend/data-model.md) — Postgres tables and Redis keys
- [AI pipeline](backend/ai-pipeline.md) — context, summarization, prompt assembly, materials, chat

### Desktop app (`desktop/`)

- [Desktop structure](desktop/README.md) — crates, layers, core traits
- [Session, audio and generation](desktop/session-and-audio.md) — audio pipeline, speech lanes, replies, screenshots
- [IPC between Rust and the UI](desktop/ipc.md) — commands and events
- [Windows and UI](desktop/windows-and-ui.md) — main window, overlay, region selection, frontend

### Technical decisions

- [Decision log (ADR)](decisions/README.md) — every significant decision with context, alternatives and consequences

## Working documents

These files predate this documentation and remain the source of truth for development.

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — the full normative specification: API contract, types, traits, every behavioural detail. If anything here disagrees with it, it wins.
- [`PLAN.md`](PLAN.md) — first-version scope and the ordered task list.
- [`RELEASE.md`](RELEASE.md) — step-by-step build and release.

The sections above are an organised guide to the same material, with explanations, diagrams and links into the code.
