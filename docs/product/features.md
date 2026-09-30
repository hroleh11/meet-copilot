# Features

Everything the first version does, grouped by the stage of working with a meeting.

## Sign-in

- **Email and password** — right in the app.
- **Google** — the button opens the system browser; after sign-in the browser returns to the app via a `cueline://auth` link.
- You can be signed in on several machines at once: signing in on a second one does not sign out the first.

Tokens are stored in the macOS Keychain. More in [Security and access](../architecture/security.md).

## Preparing a meeting

The left panel of the main window:

| Control                   | What it does                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| **Profile**               | Stand-up, interview (candidate), client call. The default comes from settings             |
| **Conversation language** | Ukrainian, English, Russian — what is spoken on the call                                  |
| **Reply language**        | Separate from the conversation language. Defaults to "whatever is spoken right now"       |
| **Project**               | Which group of meetings to add this one to                                                |
| **Meeting materials**     | Files and text for this call only                                                         |
| **Audio sources**         | Status of the microphone and meeting audio; a click opens the right macOS permission pane |
| **Start**                 | Creates the meeting and starts listening. Busy while materials are still being read       |

### Profiles

| Profile                           | How the assistant answers                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `daily` — stand-up                | Like a teammate: what is true, what blocks, the next step. Does not restate the obvious                                                                            |
| `interview_candidate` — interview | Like the candidate: a question about experience gets one concrete example and its result; a greeting gets a greeting. Never invents employers, projects or numbers |
| `client_call` — client call       | Like the person responsible for the work: acknowledge, give the substance, name the next step and its owner. No dates or scope the conversation does not support   |

### Materials for the AI

The assistant can be given documents on three levels:

| Level                 | Where it is added                             | Example                                | Prompt budget |
| --------------------- | --------------------------------------------- | -------------------------------------- | ------------- |
| **About me**          | Settings → Materials                          | Résumé, general context about yourself | 2,000 chars   |
| **About the project** | Above the meeting list when a project is open | Job description, client background     | 4,000 chars   |
| **About the meeting** | Start panel                                   | Call plan, questions I want to ask     | 6,000 chars   |

- Formats: PDF (with a text layer, no OCR), Markdown, plain text, or text pasted into a field.
- Files up to 10 MB, pasted text up to 1,000 characters. The app reads these limits from the backend.
- A document larger than its level's budget is compressed once by the model into a digest.
- Clicking a name shows what was actually read from the file.
- **Priority when they disagree:** the meeting beats the project, the project beats "about me". What is said aloud beats all materials.
- Materials freeze at start: editing your résumé mid-call does not change the running meeting.

## During the meeting

### Live transcript

- Two independent streams: your microphone is "me", system audio is "others".
- Interim text is grey and italic, then replaced by the final line.
- The status reads "Recording" while you speak and "Listening" while you are silent.
- The overlay shows the whole meeting and loads older lines when you scroll up.
- If the connection drops, each lane reconnects on its own up to five times; the meeting is not lost.

### Hotkeys

| Action                  | Default | What happens                                                                               |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------ |
| **Reply**               | `⌥R`    | A reply to what was just said                                                              |
| **Alternative**         | `⌘⇧A`   | The same thought from another angle in different words; replaces the previous draft        |
| **Screenshot**          | `⌥S`    | Select a region and the assistant answers the question from the conversation looking at it |
| **Show / hide overlay** | `⌘⇧H`   |                                                                                            |
| **Interaction mode**    | `⌘⇧M`   | The overlay starts catching the mouse: drag, resize, scroll, select text                   |

All hotkeys are changed in Settings → Hotkeys. Hints in the UI read the same string from settings.

### The reply

- One spoken reply in the first person, about 15 seconds aloud, no lists or headings.
- Streams into the overlay as it is written. A new press cancels the previous request.
- If something is unknown from the transcript or materials, the assistant says so in one clause instead of inventing it.
- The assistant knows today's date and correctly adds up experience from the date ranges in a résumé.

### Question with a screenshot

1. `⌥S` dims every monitor.
2. Drag a rectangle around what is being discussed: code, a chart, a slide. `Esc` or right-click cancels.
3. The assistant takes the question from the conversation and answers looking at the picture.

Follow-ups like "and why?" see the same screenshot; a new question about something else does not drag it along. It needs the Screen Recording permission — the same one meeting audio uses.

### Switching language mid-meeting

If an interview started in Ukrainian and moved to English, switch the language on the panel — recognition reconnects without losing a phrase. Deepgram cannot recognise mixed speech that includes Ukrainian, so the switch is manual.

## After the meeting

### History and projects

- The main window lists recent meetings; the list loads more as you scroll.
- Above it is a projects bar. Clicking a card filters the meetings; dragging a row onto a card moves the meeting into that project, dropping on "No project" takes it out.
- Meetings and projects are renamed in place (pencil, `Enter` saves, `Esc` cancels) and deleted after confirmation. Deleting a project deletes its meetings — the dialog states how many.
- A meeting that is still running, and its project, cannot be deleted.

### Meeting screen

Cards:

- **Overview** — up to three sentences on what the meeting was about.
- **Transcript** — every line with its speaker.
- **Replies** — every suggestion, marked when the reply saw the screen.
- **Materials** — what the assistant actually saw.
- **Cost** — tokens, audio seconds and an approximate price in dollars.

### Meeting chat

On the left of the meeting screen is a list of chats with search and a "New chat" button. In a chat you can ask anything about the past meeting: "which technical questions did they ask?", "how much did I talk compared to the interviewer?", "what did I say about Kubernetes?". The assistant searches and reads the transcript with tools. Every chat's history is kept.

## Settings

| Tab           | Contents                                           |
| ------------- | -------------------------------------------------- |
| **General**   | Default profile and language, reply style, account |
| **Materials** | "About me" materials                               |
| **Audio**     | Microphone choice, level check for both sources    |
| **Hotkeys**   | All five combinations                              |
| **Advanced**  | Server address, connection check                   |

Style, default language and default profile are stored on the server and are the same on every machine. Server address, microphone and hotkeys are local to the machine.

### Bluetooth headsets

When macOS opens the microphone of Bluetooth headphones, it switches them to a telephony profile and the meeting starts to sound like a phone line. So when no microphone is picked by hand, Cueline uses the built-in one. Bluetooth inputs are marked `(Bluetooth)` in settings.
