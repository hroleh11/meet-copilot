# Build and release

This document describes how to build both parts and check them on a clean machine. The decisions behind these steps are in `docs/ARCHITECTURE.md`.

## Requirements

- pnpm 12. Node 24 is downloaded by pnpm itself through `devEngines` in the root `package.json`; the Docker image enables pnpm through corepack.
- Rust stable and Xcode Command Line Tools for the app.
- Docker with compose for the backend.
- For signing: an Apple Developer account, a "Developer ID Application" certificate and an app-specific password or an App Store Connect key.

## Backend

### Variables

```
cp backend/.env.example backend/.env.production
printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" > .env
```

- `backend/.env.production` holds the application secrets: `AT_SECRET`, `RT_SECRET`, the Google, Deepgram, OpenAI and R2 keys. `DATABASE_URL` and `REDIS_URL` are not read from it: compose substitutes the service addresses itself.
- The root `.env` is read by compose. It holds the Postgres password and, if needed, `BACKEND_PORT` and `POSTGRES_USER`.
- Both files are ignored by git.

### Run

```
docker compose -f docker-compose.prod.yml up -d --build
curl http://localhost:5070/api/v1/health
```

The order is: Postgres and Redis come up until healthy, the `migrate` service applies migrations (`prisma migrate deploy`) and exits, and only then does `backend` start. So there is no separate migration step during deployment: `up -d --build` is enough.

The image is built from `backend/Dockerfile` in four stages: a shared `base` with pnpm, `build` with all dependencies (it also runs migrations), `production-modules` with runtime dependencies only, and `runtime`, into which `dist` and those dependencies are copied. The Prisma CLI pulls in Studio and pglite, so it is not in the runtime image: `--no-optional` drops optional peer dependencies, and migrations are run by the `build` stage image.

Updating to a new version:

```
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f backend
```

## App

### Icon

The source is `desktop/src-tauri/icons/icon.svg`. After changing it:

```
rsvg-convert -w 1024 -h 1024 desktop/src-tauri/icons/icon.svg -o /tmp/icon.png
cd desktop && pnpm tauri icon /tmp/icon.png
```

The command also creates Android and iOS sets — they are not kept in the repository, because there are no mobile builds.

### Unsigned build

```
cd desktop
pnpm tauri build --bundles app
```

The result is `desktop/target/release/bundle/macos/Cueline.app` with an ad-hoc signature. Such a bundle runs only on the machine where it was built and is good for checking, not for distribution.

### Signing and notarization

Tauri signs and notarizes by itself if the environment has these variables:

```
export APPLE_SIGNING_IDENTITY="Developer ID Application: Name (TEAMID)"
export APPLE_ID="apple-id@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAMID"

cd desktop && pnpm tauri build
```

Instead of `APPLE_ID` and `APPLE_PASSWORD` you can provide an App Store Connect key: `APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_PATH`. On CI the certificate is passed as `APPLE_CERTIFICATE` (base64 of the `.p12` file) and `APPLE_CERTIFICATE_PASSWORD`.

Signing uses the hardened runtime and `desktop/src-tauri/entitlements.plist`, which allows only `com.apple.security.device.audio-input`. Screen recording has no entitlement: the user grants it in System Settings, and ScreenCaptureKit asks for it on the first capture.

Checking the finished bundle:

```
codesign -dv --entitlements - "target/release/bundle/macos/Cueline.app"
spctl -a -vvv -t install "target/release/bundle/macos/Cueline.app"
xcrun stapler validate "target/release/bundle/dmg/Cueline_0.1.0_aarch64.dmg"
```

## Checking on a clean system

On a machine where the app has never run, and with a user account without permissions:

1. Install the `.dmg`, move the app to Applications, launch it. Gatekeeper must not complain.
2. Sign in: email with password or Google, which opens the browser and returns to the app through the `cueline://` scheme. In settings behind the gear, check the server address and audio: both level bars should move after the microphone and screen recording permissions.
3. Start a meeting, speak into the microphone and play audio from a meeting: both sides should appear in the transcript.
4. Press the reply hotkey: the overlay shows a reply, and it is not visible in screen sharing.
5. Stop the meeting and open it from the meeting list on the main screen: it is there with its overview, transcript, replies and cost.
6. Quit the app during a meeting: on the backend it should become `finished`.
7. Check the logs: `~/Library/Logs/com.cueline.app/cueline.<date>.log`.
