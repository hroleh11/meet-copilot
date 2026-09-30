# ADR-0002: Tauri with a platform-independent Rust core

**Status:** accepted

## Context

The app needs low-level audio capture, ScreenCaptureKit, always-on-top windows that ignore the mouse, and global hotkeys, while staying small. The first version targets macOS, but Linux and Windows should come by adding code, not by rewriting it. The logic that matters — session lifecycle, reconnects, SSE parsing, retries — must be testable without a window server.

## Decision

- **Tauri 2** with a React UI.
- A cargo workspace: `crates/core` (no Tauri, no OS-specific crates), `crates/platform-macos` (implements core traits), `src-tauri` (composition root).
- Everything external hides behind a trait in core: `AudioSource`, `AudioSources`, `BackendApi`, `SttGateway`, `ScreenCapture`, `SecretStore`, `AccessPolicy`.

## Alternatives considered

- **Electron.** Mature, but a much larger bundle, and native audio and ScreenCaptureKit would still need a native module.
- **Swift/AppKit only.** Best macOS integration, but no path to other platforms and no shared UI.
- **Logic inside `src-tauri`.** Less indirection, but untestable without Tauri and tied to one platform.

## Consequences

- `cargo test --workspace` exercises the session with fakes, including a run over recorded audio.
- A new platform is a new `crates/platform-*` crate plus `cfg(target_os)` in the composition root.
- Some macOS-specific AppKit code still lives in `src-tauri` (`app/macos_window.rs`) because it acts on Tauri windows.
