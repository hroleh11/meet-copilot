# Architecture overview

## The system at a glance

```mermaid
flowchart LR
    subgraph Mac["User's Mac"]
        direction TB
        UI["React UI<br/>main window · overlay · selection"]
        Shell["src-tauri<br/>commands · events · windows · hotkeys"]
        Core["crates/core<br/>session · audio pipeline · backend client"]
        Mac_["crates/platform-macos<br/>ScreenCaptureKit · CoreAudio"]
        UI <-->|IPC| Shell
        Shell --> Core
        Shell --> Mac_
    end

    subgraph Server["Backend (NestJS)"]
        direction TB
        API["REST · WebSocket · SSE"]
        Mods["modules<br/>auth · meetings · stt · context<br/>generation · chat · resources"]
        API --> Mods
    end

    PG[(PostgreSQL)]
    RD[(Redis)]
    R2[(Cloudflare R2)]
    DG[Deepgram]
    OAI[OpenAI]

    Core -->|"HTTPS + JWT"| API
    Core -->|"WebSocket, PCM 16 kHz"| API
    Mods --> PG
    Mods --> RD
    Mods --> R2
    Mods -->|WebSocket| DG
    Mods -->|Responses API| OAI
```

The repository is a pnpm workspace with two packages:

| Part                               | Role                                                                                           | Stack                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`backend/`](../backend/README.md) | Owns all product state and provider keys. Recognises speech, builds context, generates replies | NestJS 11, TypeScript, Prisma 7, PostgreSQL, Redis, OpenAI, Deepgram |
| [`desktop/`](../desktop/README.md) | Thin client. Captures audio, streams it to the backend, shows the transcript and replies       | Tauri 2, Rust, React 19, TypeScript, Tailwind, zustand               |

## Principles

1. **The backend is the source of truth.** Users, meetings, transcripts, summaries, settings and prompts live on the server. The app is a thin client: audio, hotkeys, overlay, display. It has no local database.
2. **Two parts, one contract.** The app and the backend talk only through the [API](../backend/api.md). Providers are known only to the backend.
3. **Postgres for what must survive everything, Redis for what is read on every request.** Redis holds the live meeting state and short-lived codes. Everything in Redis can be rebuilt from Postgres.
4. **The app core knows nothing about Tauri.** `desktop/crates/core` compiles and is tested without a UI and without macOS.
5. **Everything external hides behind an interface.** Audio sources, screen capture, secret storage, the backend client, the LLM, speech recognition and object storage are all traits or abstract classes. The composition root picks the implementation.
6. **Small files, one concept each.** A file does one thing and stays under roughly 200 lines. A module grows by splitting, not by getting longer.

## Who owns what

| Concern                         | Owner                       | Why                                                                                     |
| ------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Provider keys                   | Backend `.env` only         | Anything inside a shipped binary can be extracted                                       |
| Prompts and model choice        | Backend                     | Can change without shipping a new app; cannot be tampered with                          |
| Transcript and meeting history  | Postgres                    | Survives restarts and is visible from any machine                                       |
| Live meeting context            | Redis                       | Read on every hotkey press, must be fast                                                |
| Original material files         | Cloudflare R2               | Large binaries do not belong in the database                                            |
| Audio capture, hotkeys, windows | App                         | Needs OS access                                                                         |
| Session tokens                  | App, Keychain               | The only secret the client has                                                          |
| Subscription decision           | Backend `SubscriptionGuard` | A client-side check can be cut out; the app's `AccessPolicy` only shows a paywall early |

## Main data flows

### Speech to transcript

```mermaid
flowchart LR
    Mic[Microphone<br/>cpal] --> R1[Resample<br/>16 kHz mono i16]
    Sys[System audio<br/>ScreenCaptureKit] --> R2[Resample<br/>16 kHz mono i16]
    R1 -->|"100 ms frames"| L1[Lane: me]
    R2 -->|"100 ms frames"| L2[Lane: other]
    L1 -->|WebSocket| B[Backend STT]
    L2 -->|WebSocket| B
    B -->|WebSocket| D[Deepgram nova-3]
    D --> B
    B -->|final| PG[(Postgres segments)]
    B -->|final| RW[(Redis window)]
    B -->|partial + final| L1 & L2
    L1 & L2 --> UI[Overlay transcript]
```

### Hotkey to reply

```mermaid
flowchart LR
    K[Hotkey] --> G[Generator]
    G -->|"POST /meetings/:id/generate"| S[GenerationService]
    S --> C[Read state, summary,<br/>window, turns from Redis]
    C --> P[PromptBuilder]
    P --> O[OpenAI stream]
    O -->|SSE delta| G
    G -->|"generation:delta"| OV[Overlay]
    O --> Save[Save generation,<br/>append turn,<br/>record usage]
```

The full step-by-step story is in [A live meeting end to end](live-meeting.md).

## Extension points

The first version leaves hooks where the next features will attach, without implementing them:

| Future feature                             | Where it plugs in                                          |
| ------------------------------------------ | ---------------------------------------------------------- |
| Subscription and limits                    | `SubscriptionGuard`, `UsageRecorder`, `AccessPolicy`       |
| Linux and Windows                          | A new `crates/platform-*` crate implementing `AudioSource` |
| Local Whisper                              | Another `SttProvider` implementation                       |
| Vector search over materials               | A new tool for the meeting chat agent                      |
| Memory across meetings, stored screenshots | New sources for `PromptBuilder`                            |
| Speaker diarization                        | The `Speaker` enum and the STT result mapper               |

## Further reading

- [A live meeting end to end](live-meeting.md)
- [Security and access](security.md)
- [Technical decisions](../decisions/README.md)
