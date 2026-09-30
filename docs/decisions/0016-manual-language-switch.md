# ADR-0016: Conversation language is switched manually, reply language is separate

**Status:** accepted

## Context

Interviews often start in Ukrainian and continue in English. Deepgram's mixed-language mode (`language=multi`) does not include Ukrainian; nova-3 knows it only as the single language of a stream.

## Decision

- `PATCH /meetings/:id { language }` updates the meeting row and Redis state. The desktop session's `watch` channel tells the lanes, which flush, close and reopen their sockets. The backend reads the language from the row on connect. Audio sources keep running, so nothing is lost.
- `replyLanguage` is separate: recognise what is heard, answer in the language you are addressed in. `null` (the default) tells the model to follow the other side and switch when they switch.

## Alternatives considered

- **`language=multi`.** Does not support Ukrainian.
- **Automatic language detection per utterance.** Not available for Ukrainian in streaming mode.

## Consequences

- One press to switch, with no lost phrases.
- Language can change only while the meeting is live; on a finished one it is `409`.
