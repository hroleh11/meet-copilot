# ADR-0011: Screenshots with ScreenCaptureKit inside our own process

**Status:** accepted

## Context

"What does this code do?" needs the model to see the screen. The user must choose the region, since the system crosshair does not return its rectangle. The first attempt used `/usr/sbin/screencapture`: without permission it neither fails nor writes to stderr — it returns the desktop without windows, and the model received the wallpaper instead of the question. macOS checks a child process against the "responsible" process of its chain (in development, the IDE that launched `tauri dev`).

## Decision

- Our own transparent selection window spanning all displays.
- Capture with `SCScreenshotManager` in our process (`platform-macos/screen_capture`), using the same permission as meeting audio.
- Ask ScreenCaptureKit for permission before showing the selection (`CGPreflightScreenCaptureAccess` is unreliable).
- Compress in core: long side ≤1,400 px, JPEG ≤400 KB.
- Send it in the body of `generate`; store only `Generation.hasScreenshot`.

## Alternatives considered

- **`screencapture` child process.** Silently wrong without permission.
- **Uploading the image separately.** Storage and a round trip for a single-use image.
- **Storing screenshots.** Deferred: privacy and storage cost; the flag is enough for history now.

## Consequences

- A refusal is a visible error, never wallpaper.
- Native resolution on Retina, no upscaling on normal displays.
- Screenshots are not visible in history later.
