# ADR-0005: A plain WebSocket server for speech, and Deepgram without its SDK

**Status:** accepted

## Context

The app streams raw PCM frames to the backend, which forwards them to Deepgram and returns partial and final results. The meeting id belongs in the URL path. The stream must end gracefully: Deepgram returns the last phrase only after a flush.

## Decision

- The backend attaches a plain `ws` server to the HTTP server's `upgrade` event (`SttServer`) instead of a Nest gateway. The route is `/api/v1/meetings/:id/stt?speaker=&token=`.
- Deepgram is called over a direct WebSocket, without its SDK.
- The client ends the stream with a text `{ "type": "finish" }`. The server closes Deepgram, waits for final segments, sends them, then closes with `1000`.
- Close codes: `4401` bad token, `4404` unknown/finished meeting or speaker, `4500` recognition failure.

## Alternatives considered

- **Nest WebSocket gateway.** Its adapter expects an `event`/`data` envelope that raw PCM does not have, and it does not route by path parameters.
- **Deepgram SDK.** A dependency for what is a URL, a socket and a JSON mapper.
- **Closing the socket to stop.** Loses the last phrase.

## Consequences

- Full control over the protocol, close codes and flush semantics.
- The authenticator, route matching and connection handling are ours to test (`stt-route.spec.ts`, `stt-connection.spec.ts`).
- The client knows which close codes to retry (not `4401`/`4404`).
