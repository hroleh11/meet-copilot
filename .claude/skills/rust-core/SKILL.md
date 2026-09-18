---
name: rust-core
description: Conventions for the Rust workspace of Meet Copilot (desktop/crates/core, desktop/crates/platform-macos, desktop/src-tauri). Load before writing or changing any Rust code, Cargo.toml, audio, backend client, session, settings or Tauri command code.
---

# Rust core conventions

## Layout

- `crates/core`: domain, traits, backend client, session, local settings, access. No Tauri, no `cfg(target_os)`, no provider knowledge, no database.
- `crates/platform-macos`: `AudioSource` for system audio, permission checks. Compiled only on macOS.
- `src-tauri`: composition root, Tauri commands, events, windows, hotkeys. Thin; logic goes in core.

Module = directory with `mod.rs` that re-exports the public surface. Private files inside hold one type or one concern each.

## Traits and ownership

- Every external dependency is behind a trait in core: `AudioSource`, `BackendApi`, `SttStream`, `SecretStore`, `AccessPolicy`.
- `BackendApi` is the only way to reach the server. Its one real implementation lives in `backend/` and uses `BackendEndpoint { base_url, token }`. A `FakeBackendApi` lives under `#[cfg(test)]` helpers for session tests.
- `AccessPolicy::check` is called in exactly two places: session start and generation. Nowhere else may branch on subscription state.
- Async traits use `#[async_trait]`. Native `async fn` in traits is not yet dyn-compatible, and the composition root needs `Box<dyn BackendApi>` and `Box<dyn SttStream>`; the boxed future per call costs nothing next to a network round trip.
- `BackendApi::generate` is the exception: it returns `DeltaStream<'_>`, an alias for `Pin<Box<dyn Stream<Item = Result<Delta>> + Send + '_>>`, because a stream is the return value rather than the call itself.
- Session owns everything that lives between start and stop. Nothing outside session touches audio or STT handles.
- Shared state in `src-tauri` is `Arc<AppState>` with `tokio::sync::Mutex` or `RwLock` inside, held for the shortest scope possible. Never hold a lock across an `.await` on network I/O.

## Async and streams

- tokio multi-thread runtime, provided by Tauri.
- Audio callbacks from `cpal` run on a realtime thread: no allocation, no locking, no logging. Push into a bounded `mpsc` with `try_send` and count drops.
- Long-lived pipelines are `tokio::task`s that end on a `CancellationToken` from `tokio_util`. Every spawned task is tracked so `stop` can await it.
- Streaming outputs implement `futures::Stream`; consumers use `StreamExt`.

## Errors

- `crates/core/src/error.rs` defines `Error` with `thiserror` and `Result<T>` alias. Variants per area: `Audio`, `Backend`, `Settings`, `Permission`, `Access`, `Cancelled`.
- `Backend` carries the HTTP status or close code and the server message; 401 and 4401 map to "invalid access token", connection refused to "backend unavailable", 404 and 4404 to "meeting not found".
- Tauri commands return `Result<T, CommandError>` where `CommandError { kind, message }` is `serde::Serialize`, built from `Error` in one `From` impl.

## Audio

- Canonical frame: 16 kHz, mono, `i16`, 100 ms (1600 samples), tagged with `Speaker`.
- `MicrophoneSource` (`crates/core/src/audio/microphone.rs`) is cross-platform on `cpal`: it stays in core, not `platform-macos`, because `cpal` already abstracts CoreAudio/WASAPI/ALSA. Only permission UX is platform-specific and belongs in `platform-macos/src/permissions`.
- `cpal::Stream` is guaranteed `Send` (see `cpal::assert_stream_send!`), so `MicrophoneSource` holds it directly in a struct field; no dedicated OS thread is needed to satisfy `AudioSource: Send`.
- Device selection uses `cpal`'s `DeviceId` (`device.id()`, `host.device_by_id()`), not the deprecated `name()`. `AudioDevice.id` is `DeviceId::to_string()`, round-tripped with `FromStr` in `LocalSettings.input_device`. `name()`/`description()` is display-only.
- The cpal data callback converts samples to `f32` and downmixes to mono in one pass, then `try_send`s an owned `Vec<f32>` into a bounded `tokio::sync::mpsc` channel; a separate `tokio::spawn`ed task owns the `MonoResampler` and does the actual resampling off the audio thread. The callback still allocates once per buffer to cross the channel boundary — accepted here as pragmatic (not hard real-time DSP), not lock-free.
- `MonoResampler` (`crates/core/src/audio/resampler.rs`) wraps `rubato::Fft<f32>` with `FixedSync::Output`: the resampler's internal chunk sizes are whatever `rubato` computes for the sample-rate pair, decoupled from our 1600-sample `AudioFrame` boundary by an internal `frame_carry` buffer. Never assume the resampler's `output_frames_next()` equals `SAMPLES_PER_FRAME`.
- `rubato` 1.x buffers go through `audioadapter_buffers::direct::InterleavedSlice`, not raw slices; for mono that's `InterleavedSlice::new(&samples, 1, len)`.
- `SystemAudioSource` (`crates/platform-macos/src/system_audio`) captures the far side of the call with ScreenCaptureKit through the `objc2-screen-capture-kit` bindings. The higher-level `screencapturekit` crate is not usable here: it drags in `apple-metal`, whose build script shells out to `swiftc` and fails.
- ScreenCaptureKit always captures video, so the configuration asks for a 2x2 frame at 1 fps and simply never registers a screen output. Only the audio output is attached, on its own dispatch queue.
- The delegate is a real Objective-C class built with `define_class!`, implementing both `SCStreamOutput` (samples) and `SCStreamDelegate` (stop reason). Its ivars hold the `Sender` that feeds the resampler task.
- Audio arrives as a `CMSampleBuffer`. `sample_buffer.rs` pulls the PCM out in two passes of `CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer` (first for the size, then for the data), folds planar channels to mono, and hands the returned block buffer to `CFRetained::from_raw` so it is released.
- The generated bindings mark no ScreenCaptureKit type `Send`, so `ThreadSafe<T>` asserts it once, in one file, instead of scattering `unsafe impl` around. That one `// SAFETY:` line is the sanctioned exception to the no-comments rule.
- Never gate capture on `CGPreflightScreenCaptureAccess`: it answers `false` for processes that ScreenCaptureKit happily serves. Start the capture, and only if it fails ask whether the permission is missing and say so.
- Level meter is RMS over the frame, published at most 10 times per second, throttled per `Speaker` so one lane cannot starve the other.

## Backend client

- One `reqwest` client with a 10 s timeout for JSON calls; the generate call gets its own client without a timeout.
- `Transport` attaches the bearer token per request rather than as a default header, because the token is rotated. On a 401 it refreshes once and retries. Refreshing takes a mutex and re-reads the token after acquiring it, so parallel 401s produce one refresh: the backend deletes a session when a rotated refresh token is replayed, and a second refresh would sign the user out.
- Domain types mirror the backend DTOs with `#[serde(rename_all = "camelCase")]` on structs and `#[serde(rename_all = "snake_case")]` on enums, which reproduces the backend's wire spelling (`uk`, `interview_candidate`, `me`) without a mapping layer. `MeetingDetails` uses `#[serde(flatten)]` because the backend class extends the meeting response.
- Timestamps stay `String`. They arrive as ISO text and the UI formats them, so a date crate would buy nothing.
- `crates/core/tests/wire_contract.rs` pins every shape against literal JSON. It is the one place to look when the backend DTOs change, so it stays an integration test rather than being scattered through the modules.
- STT: `tokio-tungstenite` to `<ws base>/v1/meetings/:id/stt?speaker=<me|other>&token=<token>`. Send frame samples as little-endian bytes in binary messages. Parse JSON text messages into `SttEvent::{Partial, Final, Failed}`. The socket is split into `SttSink` and `SttEvents` so one lane can write audio and read transcript at the same time; `SttGateway::open` hands out both.
- Reconnect STT with exponential backoff up to 5 attempts; a reconnect keeps the meeting and opens a new lane. Close codes 4401 and 4404 are not retried.
- Closing a lane sends `{"type":"finish"}` and keeps reading until the backend closes with 1000, up to five seconds. Dropping the socket instead loses the last utterance, which the backend only flushes after the request. Close code 1000 ends the stream; every other code is an `SttEvent::Failed`.
- Generate: streaming body, parse SSE `event:` and `data:` lines into `Delta::{Text, Done, Error}`. A new generation cancels the previous one by cancelling its token. Retries only for connection errors before the first byte, up to 3 attempts; after the first byte a failure ends the generation and the UI keeps the partial text.

## Settings and secrets

- `LocalSettings` serialize to JSON with `serde` in the app data dir, unknown fields ignored, missing fields defaulted. They hold only what is local to the machine: backend URL, hotkeys, input device.
- `UserSettings` (style, default language, default profile) are never stored locally; they are read from and written to the backend.
- Tokens are the only secrets, behind `SecretStore`. Release builds use the OS keychain (`keyring`, service `meet-copilot`, accounts from `SecretKey`). Debug builds use a `0600` JSON file in the app config directory, because an ad-hoc signature changes on every build and the keychain then asks for the login password on every launch. `secrets::secret_store` is the single place that chooses.
- Secrets are carried in `Secret`, whose `Debug` prints `Secret(***)`, so a token cannot reach a log through a struct dump.

## Tauri boundary

- Commands are `#[tauri::command] async fn` in `src-tauri/src/commands/<area>.rs`, one file per area, each under ten commands.
- Events are emitted through a single `Emitter` wrapper that knows event names from `events.rs`. No string literals for event names anywhere else.
- Overlay window: `always_on_top(true)`, `decorations(false)`, `transparent(true)`, `set_content_protected(true)`, `focused(false)` on show. Check `tauri-nspanel` if the overlay steals focus from the meeting app.

## Checks

```
cd desktop
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```
