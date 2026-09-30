# ADR-0004: One speech stream per speaker instead of diarization

**Status:** accepted

## Context

A reply must know who said what: the user's own words are context, the other side's words are the question. Speaker diarization on a mixed stream is error-prone, especially in short turns, and a mistake makes the assistant answer the user's own question.

## Decision

Capture the microphone and the system audio as two separate sources and open two independent WebSocket streams to the backend, each with its own Deepgram connection: `speaker=me` and `speaker=other`.

## Alternatives considered

- **One mixed stream with Deepgram diarization.** Half the STT cost, but labels are guesses and "which label is me" is still unknown.
- **Echo-cancelled single stream.** Complex and still ambiguous.

## Consequences

- "Me" and "others" are known for certain from the source.
- STT cost is per stream, so roughly double for a meeting where both sides talk.
- Other participants are not separated from each other; diarization of the `other` stream remains a future option.
- Each lane reconnects on its own; losing one does not stop the other.
