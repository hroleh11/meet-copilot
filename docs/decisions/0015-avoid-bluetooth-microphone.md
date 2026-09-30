# ADR-0015: Prefer the built-in microphone over a Bluetooth headset

**Status:** accepted

## Context

When any app opens a Bluetooth headset's microphone, macOS switches the headset from A2DP to the hands-free profile: 16 kHz mono both ways. The meeting starts sounding like a phone line in the user's ears. The app cannot prevent this.

## Decision

When no microphone is chosen explicitly, the composition root asks CoreAudio for each input's transport (`platform-macos/audio_devices`) and `app/microphone_choice.rs` substitutes the built-in microphone for a Bluetooth one. In settings, Bluetooth inputs are labelled `(Bluetooth)`.

## Consequences

- Meeting audio in headphones keeps its quality by default.
- The user can still pick the headset microphone deliberately and knows the cost.
