---
name: frontend
description: Conventions for the React + TypeScript UI of Meet Copilot (desktop/src/). Load before writing or changing any component, hook, store, IPC wrapper, style or the overlay window UI.
---

# Frontend conventions

## Layout

```
desktop/src/
  main.tsx              entry for the main window
  overlay.tsx           entry for the overlay window
  app/                  routes, providers, layout
  features/<name>/      components, hooks, store for one feature
  shared/ipc/           invoke wrappers, event listeners, types mirrored from Rust
  shared/ui/            buttons, inputs, panels used by more than one feature
  shared/store/         zustand stores shared across features
  shared/lib/           pure helpers
  shared/i18n/          UI strings
```

Two Vite entries, one per window. Both share `shared/`, neither imports from the other's feature folders except through `shared/`.

## Components

- Function components, named exports, one component per file, file named like the component.
- Props typed with an `interface` named `<Component>Props`.
- Logic lives in hooks (`useSession`, `useTranscript`, `useGeneration`); components render and dispatch.
- No inline business logic inside JSX; extract to a hook or a pure function in `shared/lib`.
- Styling with Tailwind utility classes. Repeated combinations become a component in `shared/ui`, not a CSS file.

## State

- zustand stores, one per concern: `sessionStore`, `transcriptStore`, `generationStore`, `settingsStore`, `accessStore`.
- History and user settings are fetched from the backend through commands on demand and kept in feature-local state; they are not mirrored into long-lived stores.
- Stores are the only place where Tauri events mutate state. A `useTauriEvents` hook in `shared/ipc` subscribes once at app start and forwards payloads to stores.
- Derived data is computed with selectors, not stored twice.

## IPC

- `shared/ipc/commands.ts`: one typed function per Tauri command, wrapping `invoke` with request and response types.
- `shared/ipc/events.ts`: event name constants and payload types mirroring `desktop/src-tauri/src/events.rs`. Keep both in sync in the same change.
- `shared/ipc/types.ts`: domain types serialized from Rust (`Meeting`, `MeetingDetails`, `TranscriptSegment`, `LocalSettings`, `UserSettings`, ...). Field names match Rust `serde` output, which is `camelCase` via `#[serde(rename_all = "camelCase")]`.
- Errors from commands are `{ kind, message }`; surface `message` in the UI, branch on `kind` only when the UI reacts differently.

## Settings screen

- Two sections that map to two commands: local settings (backend URL, token, input device, hotkeys) and user settings from the backend (style, default language, default profile). Save buttons are separate; a failed backend save leaves local settings untouched.

## Transcript rendering

- Interim segments render in muted color and are replaced in place when the final segment with the same id arrives.
- Auto-scroll to bottom only when the user is already at the bottom.
- Speaker label: «Я» for `me`, «Співрозмовник» for `other` until diarization exists.

## Access

- `features/access` owns `useAccess` and the single paywall screen. It is the only UI that knows about entitlement; other features render normally and the app shell swaps in the paywall when `useAccess` says denied.
- First version: `useAccess` always returns allowed. The backend-unreachable and invalid-token states are ordinary errors shown by the session feature, not paywall states.

## Overlay window

- Minimal: current answer text streaming in, a copy button, a generating indicator, a close button.
- Copy uses the Tauri clipboard plugin, not `navigator.clipboard`.
- The window must not take keyboard focus; keep it free of inputs.

## Language

UI strings in Ukrainian, in a single `shared/i18n/uk.ts` map, so a second language can be added later without hunting through components.

## Checks

```
pnpm --filter desktop lint
pnpm --filter desktop typecheck
pnpm --filter desktop test
```
