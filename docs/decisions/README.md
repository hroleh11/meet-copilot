# Technical decisions

Each significant decision is recorded as a short ADR (Architecture Decision Record): the context that forced it, what was decided, what else was considered, and what it costs.

When a decision changes, update its record in the same change as the code, and adjust [`ARCHITECTURE.md`](../ARCHITECTURE.md) if it describes the behaviour.

## Index

### System shape

| #                                                  | Decision                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| [0001](0001-backend-owns-state.md)                 | The backend owns all state; the app is a thin client                     |
| [0002](0002-rust-core-without-tauri.md)            | Tauri with a platform-independent Rust core                              |
| [0003](0003-postgres-and-redis.md)                 | Postgres for what must survive, Redis for what is read on every keypress |
| [0012](0012-browser-sign-in-with-one-time-code.md) | Google sign-in through the system browser and a one-time code            |

### Speech and transport

| #                                          | Decision                                                      |
| ------------------------------------------ | ------------------------------------------------------------- |
| [0004](0004-one-stream-per-speaker.md)     | One speech stream per speaker instead of diarization          |
| [0005](0005-raw-websocket-for-speech.md)   | A plain WebSocket server for speech, Deepgram without its SDK |
| [0006](0006-post-sse-for-generation.md)    | Generation as a POST with hand-written SSE frames             |
| [0016](0016-manual-language-switch.md)     | Manual language switch, separate reply language               |
| [0015](0015-avoid-bluetooth-microphone.md) | Prefer the built-in microphone over a Bluetooth headset       |

### Prompting and context

| #                                                     | Decision                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| [0007](0007-stable-prompt-prefix.md)                  | A byte-stable prompt prefix for caching                          |
| [0008](0008-conversation-turns.md)                    | The prompt is a conversation with turns, not one block           |
| [0010](0010-materials-in-prompt-without-retrieval.md) | Materials on three levels, whole in the prompt, no vector search |
| [0013](0013-date-next-to-the-question.md)             | Today's date next to the question, not in the system text        |
| [0014](0014-meeting-chat-as-tool-agent.md)            | The meeting chat is a tool-using agent                           |

### macOS integration

| #                                         | Decision                                                        |
| ----------------------------------------- | --------------------------------------------------------------- |
| [0009](0009-overlay-window.md)            | A transparent, content-protected overlay that ignores the mouse |
| [0011](0011-in-process-screen-capture.md) | Screenshots with ScreenCaptureKit inside our own process        |

## Template

```markdown
# ADR-NNNN: Title

**Status:** proposed | accepted | superseded by ADR-XXXX

## Context

What forced the decision.

## Decision

What we do.

## Alternatives considered

What else was possible and why not.

## Consequences

What becomes easier, what becomes harder.
```
