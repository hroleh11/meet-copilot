# Configuration

Settings live in three places, each for its own reason.

| Where                 | What                                       | Who changes it                  |
| --------------------- | ------------------------------------------ | ------------------------------- |
| `backend/.env`        | Provider keys, JWT secrets, models, limits | Whoever deploys the server      |
| `user_settings` table | Style, default language and profile        | The user, same on every machine |
| Local app file        | Server address, microphone, hotkeys        | The user, per machine           |

## Backend environment variables

Schema and defaults are in [`backend/src/common/config/env.schema.ts`](../../backend/src/common/config/env.schema.ts). The backend validates them with zod at startup and refuses to start if anything is missing. The template is `backend/.env.example`.

### Server

| Variable                 | Default       | Description                                                                                      |
| ------------------------ | ------------- | ------------------------------------------------------------------------------------------------ |
| `NODE_ENV`               | `development` | `development`, `test` or `production`                                                            |
| `PORT`                   | `5070`        | HTTP and WebSocket port                                                                          |
| `API_PREFIX`             | `api/v1`      | Prefix of every route                                                                            |
| `MAX_REQUEST_BODY_BYTES` | `1048576`     | JSON body limit. 1 MB because the generation body carries a screenshot of up to 400 KB in base64 |

### Storage

| Variable                                                               | Description                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                         | Postgres. Locally `postgresql://cueline:cueline@localhost:5440/cueline?schema=public` |
| `REDIS_URL`                                                            | Redis. Locally `redis://localhost:6390`                                               |
| `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Cloudflare R2 for the original material files                                         |

### Authentication

| Variable                                   | Description                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `AT_SECRET`, `RT_SECRET`                   | Signing secrets for access and refresh tokens, 16+ characters, different from each other     |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client                                                                          |
| `GOOGLE_CALLBACK_URL`                      | Where Google returns after sign-in, e.g. `http://localhost:5070/api/v1/auth/google/callback` |
| `DESKTOP_REDIRECT_URL`                     | Where the backend sends the browser with the one-time code: `cueline://auth`                 |

### AI providers

| Variable                 | Default         | Description                                                              |
| ------------------------ | --------------- | ------------------------------------------------------------------------ |
| `OPENAI_API_KEY`         |                 | OpenAI key                                                               |
| `DEEPGRAM_API_KEY`       |                 | Deepgram key                                                             |
| `REPLY_MODEL`            | `gpt-5.6-terra` | Model for replies and meeting chat                                       |
| `REPLY_EFFORT`           | `low`           | Reasoning effort for replies                                             |
| `SUMMARY_MODEL`          | `gpt-5.4-mini`  | Model for the rolling summary, the meeting overview and material digests |
| `SUMMARY_EFFORT`         | `low`           | Reasoning effort for summaries                                           |
| `LLM_TIMEOUT_MS`         | `60000`         | OpenAI request timeout. Does not apply to the reply stream itself        |
| `STT_CONNECT_TIMEOUT_MS` | `10000`         | Deepgram handshake timeout                                               |

`REPLY_EFFORT` and `SUMMARY_EFFORT` accept `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. The models and levels were chosen by measuring latency and reply length on real prompts: a reply during a call is only useful while it is fast.

### Meeting context

| Variable                       | Default | Description                                                         |
| ------------------------------ | ------- | ------------------------------------------------------------------- |
| `WINDOW_MAX_CHARS`             | `6000`  | How much fresh transcript the model sees verbatim                   |
| `SUMMARY_TRIGGER_CHARS`        | `3000`  | How much text must pile up outside the window before a summary runs |
| `FINISHED_MEETING_TTL_SECONDS` | `86400` | How long the Redis keys of a finished meeting live                  |
| `LIVE_MEETING_IDLE_SECONDS`    | `900`   | How much silence makes a meeting count as stale and get closed      |

How these numbers work together: [AI pipeline](../backend/ai-pipeline.md#window-and-summary).

### Materials

| Variable                       | Default    | Description                                                    |
| ------------------------------ | ---------- | -------------------------------------------------------------- |
| `RESOURCE_MAX_BYTES`           | `10485760` | Maximum file size, 10 MB                                       |
| `RESOURCE_TEXT_MAX_CHARS`      | `1000`     | Maximum length of hand-pasted text                             |
| `RESOURCE_EXTRACTED_MAX_CHARS` | `5000`     | Cap on text extracted from a file                              |
| `STAGED_RESOURCE_TTL_HOURS`    | `24`       | When a material for a meeting that never started is cleaned up |

## User settings

`GET /settings` and `PUT /settings`:

| Field             | Value                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `style`           | Free text about how you talk. `null` means the default style: brief, conversational, concrete, no filler |
| `defaultLanguage` | `uk`, `en` or `ru`                                                                                       |
| `defaultProfile`  | `daily`, `interview_candidate` or `client_call`                                                          |

Cached in Redis under `settings:{userId}`. The style freezes into the meeting state when the meeting starts.

## Local app settings

Type `LocalSettings` in [`desktop/crates/core/src/settings/local.rs`](../../desktop/crates/core/src/settings/local.rs). Stored as a file in the app data directory.

| Field                 | Default                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| `backendUrl`          | `http://localhost:5070/api/v1`                                             |
| `inputDevice`         | unset: the built-in microphone, even when a Bluetooth headset is connected |
| `hotkeys.reply`       | `Alt+R`                                                                    |
| `hotkeys.alternative` | `CommandOrControl+Shift+A`                                                 |
| `hotkeys.screenshot`  | `Alt+S`                                                                    |
| `hotkeys.hide`        | `CommandOrControl+Shift+H`                                                 |
| `hotkeys.interact`    | `CommandOrControl+Shift+M`                                                 |

Hotkeys are re-registered as soon as settings are saved.

## App secrets

The app holds no provider key. Its only secrets are the session token pair:

- **Release build** — macOS Keychain via `keyring`.
- **Debug build** — a file with `0600` permissions. The ad-hoc signature changes with every build and Keychain would ask for a password each time.

Logs print tokens as `Secret(***)`.
