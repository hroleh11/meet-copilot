# API reference

Base prefix: `/api/v1`. Every route not marked **public** requires `Authorization: Bearer <accessToken>`. The interactive version is Swagger at `/api/v1/docs`.

The normative contract with every edge case is in [`ARCHITECTURE.md`](../ARCHITECTURE.md#api-contract).

## Enumerations

| Name                | Values                                                         |
| ------------------- | -------------------------------------------------------------- |
| `profile`           | `daily`, `interview_candidate`, `client_call`                  |
| `language`          | `uk`, `en`, `ru`                                               |
| `replyLanguage`     | a `language` or `null` — "answer in the language being spoken" |
| `mode`              | `reply`, `alternative`                                         |
| `speaker`           | `me`, `other`                                                  |
| `scope`             | `user`, `project`, `meeting`                                   |
| `kind`              | `pdf`, `markdown`, `text`                                      |
| `status` (resource) | `pending`, `ready`, `failed`                                   |
| `failure`           | `unreadable`, `no_text_layer`, `storage`                       |

## Errors

Every error has the same JSON shape from `AllExceptionsFilter`. Conventions:

| Code  | When                                        |
| ----- | ------------------------------------------- |
| `400` | DTO validation failed                       |
| `401` | Missing or invalid access token             |
| `429` | Rate limit exceeded (`ThrottlerGuard`)      |
| `404` | Not found **or belongs to someone else**    |
| `409` | The action conflicts with a running meeting |
| `413` | Body larger than `MAX_REQUEST_BODY_BYTES`   |

## Auth

| Method | Path                                | Body                        | Result                              |
| ------ | ----------------------------------- | --------------------------- | ----------------------------------- |
| `POST` | `/auth/register` · public           | `{ email, name, password }` | token pair                          |
| `POST` | `/auth/login` · public              | `{ email, password }`       | token pair                          |
| `POST` | `/auth/refresh` · public, `RtGuard` | `{ refreshToken }`          | new token pair                      |
| `POST` | `/auth/logout`                      |                             | deletes the current session         |
| `GET`  | `/auth/google` · public             |                             | redirect to Google                  |
| `GET`  | `/auth/google/callback` · public    |                             | redirect to `cueline://auth?code=…` |
| `POST` | `/auth/exchange` · public           | `{ code }`                  | token pair                          |

Token pair: `{ accessToken, refreshToken, expiresIn }`.

## User and settings

| Method | Path        | Body       | Result                                       |
| ------ | ----------- | ---------- | -------------------------------------------- |
| `GET`  | `/users/me` |            | profile                                      |
| `GET`  | `/settings` |            | `{ style, defaultLanguage, defaultProfile }` |
| `PUT`  | `/settings` | same shape | saved settings                               |

## Projects

| Method   | Path            | Body       | Result                                                                            |
| -------- | --------------- | ---------- | --------------------------------------------------------------------------------- |
| `GET`    | `/projects`     |            | `[{ id, name, meetingCount, createdAt, updatedAt }]`, most recently changed first |
| `POST`   | `/projects`     | `{ name }` | project                                                                           |
| `PATCH`  | `/projects/:id` | `{ name }` | renamed project                                                                   |
| `DELETE` | `/projects/:id` |            | deletes the project **and its meetings**; `409` while any of them is running      |

## Materials

| Method   | Path                                      | Body                                             | Result                                |
| -------- | ----------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| `GET`    | `/resources?scope=&projectId=&meetingId=` |                                                  | materials of one level, newest first  |
| `POST`   | `/resources`                              | multipart: `file`, `scope`, `name`, `projectId?` | resource with `status: pending`       |
| `POST`   | `/resources/text`                         | `{ scope, projectId?, name, text }`              | resource, immediately `ready`         |
| `GET`    | `/resources/:id`                          |                                                  | the resource; poll while `pending`    |
| `GET`    | `/resources/:id/content`                  |                                                  | `{ name, text, digest, chars }`       |
| `GET`    | `/resources/limits`                       |                                                  | `{ maxBytes, maxTextChars }`          |
| `DELETE` | `/resources/:id`                          |                                                  | deletes the row and the stored object |

Notes:

- `scope` is always explicit; without it the list is empty.
- The file name travels as a separate `name` field because multipart `filename` is decoded as latin-1 and breaks anything outside ASCII.
- A `meeting` material uploaded before start has no `meetingId`. It is visible only to its uploader and is claimed through `resourceIds` in `POST /meetings`.
- Only `text/plain`, `text/markdown` and `application/pdf` are accepted.

## Meetings

| Method   | Path                                  | Body                                                                      | Result                                                               |
| -------- | ------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `POST`   | `/meetings`                           | `{ profile, language, replyLanguage?, title?, projectId?, resourceIds? }` | `{ id, status, startedAt }`                                          |
| `POST`   | `/meetings/:id/finish`                |                                                                           | `{ id, status, endedAt }`                                            |
| `GET`    | `/meetings?limit=&cursor=&projectId=` |                                                                           | a page without transcripts, newest first                             |
| `GET`    | `/meetings/:id`                       |                                                                           | meeting, `overview`, `segments`, `generations`, `resources`, `usage` |
| `PATCH`  | `/meetings/:id`                       | `{ title?, projectId?, language?, replyLanguage? }`                       | updated meeting                                                      |
| `DELETE` | `/meetings/:id`                       |                                                                           | deletes with transcript, replies and chats; `409` while running      |

- **Pagination:** `cursor` is the id of the last meeting shown. A page shorter than `limit` means the end — there is no `hasMore`.
- `projectId=none` returns meetings outside any project.
- `projectId: null` in `PATCH` removes the meeting from its project.
- Language can be changed only while the meeting runs; on a finished one it is `409`.
- `usage` holds tokens and audio seconds only. The app estimates the price.

## Speech: WebSocket

```
GET /api/v1/meetings/:id/stt?speaker=me|other&token=<accessToken>
Upgrade: websocket
```

| Direction       | Message                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| client → server | binary frames: PCM, 16 kHz, mono, `i16` little-endian                    |
| client → server | text `{ "type": "finish" }` to end the stream gracefully                 |
| server → client | `{ type: "partial" \| "final", id, speaker, text, startMs, durationMs }` |
| server → client | `{ type: "error", message }`                                             |

Close codes:

| Code   | Meaning                                         | Client retries? |
| ------ | ----------------------------------------------- | --------------- |
| `1000` | Normal close after the client's `finish`        | —               |
| `4401` | Invalid token                                   | no              |
| `4404` | Unknown or finished meeting, or unknown speaker | no              |
| `4500` | Recognition failure                             | yes             |

After `finish` the server closes the Deepgram stream, waits for the last final segments, sends them and only then closes with `1000`.

## Generation: SSE

```
POST /api/v1/meetings/:id/generate
Content-Type: application/json

{ "mode": "reply" | "alternative", "screenshot"?: { "mimeType": "image/jpeg" | "image/png", "dataBase64": "…" } }
```

Response `text/event-stream`:

| Event   | Data                                                                                    |
| ------- | --------------------------------------------------------------------------------------- |
| `delta` | `{ text }`                                                                              |
| `done`  | `{ generationId, stopReason, usage: { inputTokens, cachedInputTokens, outputTokens } }` |
| `error` | `{ message }`                                                                           |

Ownership and status are checked **before** the stream opens, so those errors arrive as ordinary HTTP codes. Disconnecting cancels the provider request; the partial reply is still saved.

## Meeting chat

| Method   | Path                          | Body           | Result                                                                    |
| -------- | ----------------------------- | -------------- | ------------------------------------------------------------------------- |
| `GET`    | `/meetings/:id/chats?query=`  |                | chats, most recently changed first; `query` searches titles and questions |
| `POST`   | `/meetings/:id/chats`         |                | new chat                                                                  |
| `GET`    | `/meetings/:id/chats/:chatId` |                | messages, oldest first                                                    |
| `POST`   | `/meetings/:id/chats/:chatId` | `{ question }` | SSE: `delta`, `done { messageId, … }`, `error`                            |
| `DELETE` | `/meetings/:id/chats/:chatId` |                | deletes the chat with its messages                                        |

A chat takes its title from the first question and keeps it.

## Health

| Method | Path               | Result                        |
| ------ | ------------------ | ----------------------------- |
| `GET`  | `/health` · public | `{ status, postgres, redis }` |
