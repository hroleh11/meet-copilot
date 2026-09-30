# ADR-0006: Generation as a POST with hand-written SSE frames

**Status:** accepted

## Context

A reply must appear word by word in under a couple of seconds. The request carries a body (mode and an optional screenshot). Errors such as "meeting not found" should look like normal HTTP errors, not events inside a stream.

## Decision

`POST /meetings/:id/generate` and `POST /meetings/:id/chats/:chatId` respond with `text/event-stream`, written by hand through `SseWriter`. Ownership and status are checked **before** the stream opens. Events: `delta`, `done`, `error`. A client disconnect cancels the provider request, and the partial reply is still saved.

## Alternatives considered

- **Nest `@Sse()`.** Works only on `GET` and accepts no body.
- **WebSocket.** Bidirectional for a one-shot request, and one more connection to manage.
- **A separate upload for the screenshot.** Adds storage and a second round trip for one image that is used once.

## Consequences

- Clean HTTP errors before streaming, stream errors only for provider failures.
- `MAX_REQUEST_BODY_BYTES` is 1 MB to fit a 400 KB screenshot in base64.
- The desktop uses a separate HTTP client with no overall timeout for streams.
- SSE parsing in core is shared (`sse::frames`), with each feature reading its own `done` payload.
