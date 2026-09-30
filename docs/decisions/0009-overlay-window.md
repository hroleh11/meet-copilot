# ADR-0009: A transparent, content-protected overlay that ignores the mouse

**Status:** accepted

## Context

The reply must be visible while the user looks at the call — often a full-screen Meet or Zoom — and must not appear when the user shares the screen. It must not steal focus or block clicks on the call window.

## Decision

- A separate always-present overlay window with `set_content_protected(true)`.
- `set_ignore_cursor_events(true)` by default; a hotkey toggles interaction mode.
- Window level `NSScreenSaverWindowLevel`, collection behaviour `CanJoinAllSpaces | FullScreenAuxiliary | Stationary | IgnoresCycle`, `hidesOnDeactivate(false)`.
- The class is swapped to `NSPanel` only while the flags are set, then swapped back.
- `transparent: true` with `macOSPrivateApi` for the glass effect; the shadow is drawn in CSS.
- No buttons: copy is text selection, regenerate is a hotkey.

## Alternatives considered

- **Leaving the window an `NSPanel` permanently.** Breaks AppKit's KVO observers on tao's `NSKVONotifying_TaoWindow`; the app crashes on `removeObserver`.
- **Showing the reply in the main window.** The user looks at the call, not at the app.
- **Opaque window.** Avoids the private API but does not match the design.

## Consequences

- Visible over full-screen apps on every Space, invisible in screen sharing.
- `macOSPrivateApi` rules out the App Store; distribution is a notarized DMG.
- The overlay is also missing from ordinary screenshots, so presence is checked with `CGWindowListCopyWindowInfo`.
