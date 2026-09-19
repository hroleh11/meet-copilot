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

Three Vite entries, one per window (`main`, `overlay`, `selection`). They share `shared/`, and none imports from another's feature folders except through `shared/`.

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
- An error from `app:error` is transient: `useTransientMessage` clears it after twelve seconds, because a banner that stays reads as the state of the last thing the user did.
- Errors from commands are `{ kind, failure, message }`. The message from Rust is English and stays out of the UI: `shared/lib/command-error.ts` turns `failure` first and then `kind` into Ukrainian. Every new kind needs an entry there, otherwise it shows up as the generic "the server answered with an error".

## Settings screen

- Four tabs in a left rail: General (user settings from the backend: default profile, default language, answer style, plus the account row), Audio (input device, level meters, the check), Hotkeys, Advanced (backend URL, connection check). The tab is local state of the screen, not a route.
- The tabs still map to the same two commands, and each tab saves what it edits: the General tab writes user settings, the other three merge their part into `LocalSettings` and write it. Save buttons stay per tab; a failed backend save leaves local settings untouched.
- A tab is built from `SettingsGroup` (uppercase label plus a card) and `SettingsRow` (label on the left, control on the right, `stacked` when the control is a textarea). Controls inside a card take `tone="recessed"` so they read as fields against the elevated card, in both themes.

## Main screen and projects

- The right side of the main window is `ProjectsBar` above `RecentMeetingsList`. A card shows a project's name and how many meetings it holds; the «Без проєкту» card comes first and stands for the meetings outside every project. Clicking a card narrows the list below it, clicking the open one again shows everything, so there is no separate project screen to walk to and back from.
- A meeting joins a project by being dragged onto its card. `shared/lib/meetingDrag.ts` holds both halves: `useMeetingDrag` puts the id under `application/x-meet-copilot-meeting`, `useMeetingDrop` highlights a card only when that type is among `dataTransfer.types`, because the payload itself cannot be read before the drop. Dropping on «Без проєкту» takes the meeting out. The main window sets `dragDropEnabled: false` in `tauri.conf.json`; Tauri's own drag and drop is for files from the system and fights HTML5 dragging inside the webview.
- Renaming is in place through `shared/lib/useRename`: the pencil turns the title into a field, Enter saves, Escape cancels, an empty or unchanged name saves nothing. Deleting goes through `ConfirmDialog`, and a project holding meetings says in the dialog how many of them go with it.
- Both lists re-read themselves instead of patching a row: `MainWindow` keeps one `revision` counter, every successful change bumps it, and `useProjects` and `useMeetings` reload on it. A meeting that moves leaves one list, joins another and changes two counters, so a local edit would drift from the server.
- `useMeetings` takes the scope (`{ kind: 'all' | 'outside' | 'project', id? }`), which mirrors the adjacently tagged Rust enum `MeetingScope` and travels straight to `list_meetings`.

## Materials

- `features/resources` has one panel for all three levels: the list, «Додати файл» through `tauri-plugin-dialog`, and a form for pasted text. Only the `ResourceScope` differs, and the scope objects are module constants (`scopes.ts`) so the hook's effect does not refire on every render.
- The user level is the «Матеріали» tab in settings, the project level appears above the meeting list while a project is open on the projects bar, and the meeting level sits on the start panel beside the profile, the language and the new project select. The project has to be chosen before the start now, because it decides which project materials the copilot is given; dragging a meeting onto a project afterwards still works as before.
- `useResources` follows a material while it is `pending`, because the upload answers before the document has been read. That same wait disables the start button, so a meeting never starts on a document nobody has read. After a start, `MainWindow` bumps `revision` and the staged list comes back empty: the meeting took them.
- That follow is a `setInterval`, not one `setTimeout`. The ids being waited on do not change while they are still being read, so the effect never re-runs on its own and a single timeout asked exactly once — the panel then sat on «Читаємо…» until the screen was opened again. `useResources.test.tsx` pins it.
- A ready material opens on a click into `ResourceViewer`, which shows the extracted text, or the digest when the document did not fit its level, because the digest is what the model is actually given. Limits come from `GET /resources/limits` rather than being repeated in the UI.
- The file picker hands over a path, not bytes. Rust reads the file and refuses anything that is not PDF, Markdown or text, which reaches the UI as the `resource` error kind.

## Meeting screen

- `app/MeetingScreen.tsx` is the only place a meeting is read: the chats of that meeting on the left (`features/chat/ChatsSidebar`), the meeting itself in the middle (`features/history/MeetingDetails`). No list of other meetings here; those are reached from the main screen.
- The middle column is one card per thing: the meeting with its short overview, the transcript, the answers, the cost. They are separate `Panel`s on purpose — run together they read as one grey wall.
- Lists page themselves through `useMeetings` and `useEndOfList`: a page is asked for as the bottom comes into reach, and a short page means the end. The overlay transcript grows the other way with `useTranscriptScroll`, which also stops following the bottom while the user reads.

## Chat screen

- A chat is another screen of the main window, not a window of its own: `View` in `app/App.tsx` carries `chat` with `meetingId` and `chatId`, and back from a chat leads to its meeting rather than to the main screen.
- It reads like a messenger: the question on the right in an accent bubble, the answer on the left, the time in the corner, `useStickToBottom` keeping the newest message in sight until the user scrolls up to read.
- `useChat` keeps the question being answered in `pending` and moves it into the history when the backend reports the stored message, so a streaming answer never needs a store. Chat events carry `chatId`, and a window ignores everything that is not its own.
- The exchange being written also lives in a ref. A state updater must stay pure: growing the answer or appending to the history from inside one makes React run it twice under `StrictMode`, which is how the finished answer once landed in the thread twice. Compute the next value, then call the setter with it.
- `ChatsSidebar` stands beside both screens, with the open chat outlined on the chat one. It takes `onOpenChat` and `onChatRemoved` and never navigates itself; the app shell decides what opening a chat means and leaves a chat that was deleted while open.
- Deleting goes through `shared/ui/ConfirmDialog`, which names the chat it is about and answers Escape and a click outside. It is an ordinary overlay rather than a native `<dialog>`: the native one is driven imperatively and jsdom has no `showModal`, so it could not be tested. The destructive button is `variant="danger"`. The list is refetched when `answered` changes, so a chat that has just earned its name from the first question shows it without a trip back to the meeting.

## Transcript rendering

- Interim segments render in muted color and are replaced in place when the final segment with the same id arrives.
- Auto-scroll to bottom only when the user is already at the bottom.
- Speaker label: «Я» for `me`, «Співрозмовник» for `other` until diarization exists.

## Access

- `features/access` owns `useAccess` and the single paywall screen. It is the only UI that knows about entitlement; other features render normally and the app shell swaps in the paywall when `useAccess` says denied.
- First version: `useAccess` always returns allowed. The backend-unreachable and invalid-token states are ordinary errors shown by the session feature, not paywall states.

## Region selection window

- `selection.tsx` → `SelectionApp` → `features/generation/RegionSelector` is the whole window: a transparent surface that dims the screen, draws the rectangle being dragged and reports it with `finishSelection`. Escape, a right click or a click without a drag call `cancelSelection`.
- The rectangle is reported in CSS pixels of the window; Rust adds the monitor origin and scale. The component never talks to the screen itself.

## Overlay window

- Minimal: current answer text streaming in, a copy button, a generating indicator, a close button.
- Copy uses the Tauri clipboard plugin, not `navigator.clipboard`.
- The window must not take keyboard focus; keep it free of inputs.
- It is a second Vite entry (`overlay.html` → `src/overlay.tsx` → `OverlayApp`) sharing `shared/`. Both entries are listed in `build.rollupOptions.input`.
- The overlay subscribes to the generation events itself through `useGenerationEvents`; the main window does not mirror the answer.
- Each window has its own React root and therefore its own zustand stores. A store cleared in the main window stays untouched in the overlay, which is how the transcript of a finished meeting used to sit there into the next one. Anything the overlay must forget is forgotten from state the overlay itself sees: `sessionStore.setState` keeps the lines only while the meeting is `listening` or `stopping`, and `useAnswer` clears the answer on `idle`.

## Language

UI strings in Ukrainian, in a single `shared/i18n/uk.ts` map, so a second language can be added later without hunting through components.

## Checks

```
pnpm --filter desktop lint
pnpm --filter desktop typecheck
pnpm --filter desktop test
```
