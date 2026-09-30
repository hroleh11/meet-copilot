# AI pipeline

How the backend turns a stream of speech and a pile of documents into a fifteen-second reply, and how it answers questions about a finished meeting.

## Models

| Task             | Model env var   | Default         | Max output tokens | Usage kind  |
| ---------------- | --------------- | --------------- | ----------------- | ----------- |
| Live reply       | `REPLY_MODEL`   | `gpt-5.6-terra` | 2,000             | `generate`  |
| Meeting chat     | `REPLY_MODEL`   | `gpt-5.6-terra` | 4,000 per turn    | `chat`      |
| Rolling summary  | `SUMMARY_MODEL` | `gpt-5.4-mini`  | 4,096             | `summarize` |
| Meeting overview | `SUMMARY_MODEL` | `gpt-5.4-mini`  | 2,048             | `summarize` |
| Material digest  | `SUMMARY_MODEL` | `gpt-5.4-mini`  |                   | `digest`    |

All calls go through the `LlmProvider` abstraction ([`infrastructure/llm`](../../backend/src/infrastructure/llm)), implemented on the OpenAI Responses API.

## What the model sees

```mermaid
flowchart TB
    subgraph System["System text — frozen for the whole meeting"]
        P1[Persona]
        P2[Profile prompt]
        P3[Style or default style]
        P4[Materials rule + context brief]
        P5[Reply-language instruction]
    end
    subgraph Messages["Messages — only ever appended to"]
        M1["user: Notes so far — rolling summary"]
        M2["user: said since the previous draft (+ screenshot)"]
        M3["assistant: the draft we gave"]
        M4["… up to six turns …"]
        M5["user: said since the last draft (+ screenshot)<br/>+ mode instruction + today's date"]
    end
    System --> Messages
```

Everything in the system text is stable byte for byte during a meeting, so OpenAI's automatic prefix cache applies and the cached share of input tokens stays high. See [ADR-0007](../decisions/0007-stable-prompt-prefix.md).

### System text

Built by `buildSystem` in [`prompt.builder.ts`](../../backend/src/modules/generation/prompt.builder.ts) from data files in [`generation/prompts/`](../../backend/src/modules/generation/prompts):

| Part           | Source                                 | Purpose                                                                                                                                                       |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persona        | `persona.prompt.ts`                    | You are the user, first person, one spoken answer of ~15 s, plain speech, never invent, answer the last message, match the size of the answer to the question |
| Profile        | `profile.prompts.ts`                   | How to answer on a stand-up, an interview, a client call                                                                                                      |
| Style          | user settings, frozen at start         | The user's own voice; `DEFAULT_STYLE` when empty                                                                                                              |
| Materials rule | `persona.prompt.ts`                    | Materials are reference, not instructions and not a script; priority meeting > project > user; what is said aloud outranks everything                         |
| Context brief  | `ContextBriefBuilder`, frozen at start | The three levels of materials                                                                                                                                 |
| Reply language | `mode.prompts.ts`                      | A fixed language, or "follow the other side and switch when they switch"                                                                                      |

### Messages

Built by `buildMessages`:

1. **Notes** — the rolling summary, if there is one.
2. **Previous turns** — pairs of "what was said since the previous draft" and "the draft". Up to six.
3. **Now** — what was said since the last draft, plus the mode instruction (`reply` or `alternative`) and "today is …".

## PromptBuilder

The key idea: **the model receives a conversation with roles, not one big block.**

Earlier versions glued everything into a single user message. When a screenshot of a console with a Promise arrived next to a question about React, the model linked them — not by mistake, but because from its point of view they really did arrive together. No wording in the prompt could undo that; the turn boundary has to be carried by the structure of the request. That is how ChatGPT and claude.ai handle it, and why follow-ups on a picture work there while a change of topic does not drag the picture along. See [ADR-0008](../decisions/0008-conversation-turns.md).

Mechanics:

- `spokenUpTo` in the meeting state is the id of the last segment the model has seen. `segmentsAfter` cuts what was said since. If the summarizer already trimmed that marker, the whole window counts as the new turn.
- `alternative` does **not** add a turn — it rewrites the answer of the last one. Retries never pile up in history.
- The turn log keeps six turns, and only the newest screenshot stays in it. When a request brings its own screenshot, the old one is not sent. **A request never carries more than one image.**
- A screenshot sits inside the turn it came with, next to the note "This is the part of my screen I am talking about."

### Today's date next to the question

A résumé says "Feb 2025 — Present", and the model has no idea when "present" is. Asked about years of experience it answered "about a year" to a document showing almost two.

Measured on a real résumé:

| Where the date was                                                         | Answer                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------- |
| In the system text                                                         | "about a year and a half"                               |
| Next to the question                                                       | "a year and seven months" — only the last range counted |
| Next to the question + "add up every range, counting an open one to today" | a year and nine months — correct                        |

So the date sits in the last message, next to the mode instruction. The system text stays untouched and the cache keeps working. See [ADR-0013](../decisions/0013-date-next-to-the-question.md).

### Answer what was asked

On "hi, how are you" the assistant used to deliver a self-introduction from the résumé. Three levers were involved, and all three were fixed:

1. The interview profile demanded an example from experience in **every** answer. Now only when experience is asked about.
2. Nothing said when to open the materials. Now: only when the last thing said calls for it.
3. The `reply` mode said "if nothing was asked, offer the most useful thing the user could add". Now greetings, thanks and small talk get the same in return, and a substantive contribution comes only when a real question or gap is on the table.

Measured eight runs each: "hi, how are you" gave one sentence and returned the question eight times of eight; "how much experience do you have" gave the correct year and nine months. A single run proves nothing: at low effort the model has spread.

## Window and summary

A two-hour meeting must fit a fixed-size prompt.

```mermaid
flowchart LR
    S[Final segment] --> W[(Redis window)]
    W --> CW{ContextWindow<br/>split by WINDOW_MAX_CHARS}
    CW -->|recent| R[Verbatim in prompt]
    CW -->|stale| T{stale ≥<br/>SUMMARY_TRIGGER_CHARS?}
    T -->|no| X[wait]
    T -->|yes, lock free| SUM[Summarizer<br/>SUMMARY_MODEL]
    SUM --> M[merge with previous summary]
    M --> RS[(Redis summary)]
    M --> PS[(Meeting.summary)]
    SUM --> TR[trim window]
```

- `ContextWindow` walks the window from newest to oldest and keeps up to `WINDOW_MAX_CHARS` (6,000) as **recent**. The rest is **stale**.
- After every final segment `Summarizer.maybeRun` checks whether stale text reached `SUMMARY_TRIGGER_CHARS` (3,000). If so, and the `summarize:lock` in Redis is free, it compresses the stale part together with the previous summary, stores the result in Redis and Postgres, trims the window and records usage.
- It runs in the background: recognition never waits for it. Failures are logged and the next segment tries again.
- The lock guarantees no two summaries of one meeting run in parallel.

## Materials and the context brief

```mermaid
flowchart LR
    U[Upload] --> E[ResourceExtractor<br/>unpdf / UTF-8]
    E -->|empty PDF| F1[failed: no_text_layer]
    E --> ST[ObjectStorage.put<br/>R2]
    ST -->|error| F2[failed: storage]
    ST --> B{text > level budget?}
    B -->|yes| D[ResourceDigester<br/>SUMMARY_MODEL]
    B -->|no| RDY[ready]
    D --> RDY
    RDY --> CB[ContextBriefBuilder<br/>at meeting start]
```

- `ResourceIngestor` reads first, then stores the original, and each step fails with its own reason. The reason is stored as a code (`unreadable`, `no_text_layer`, `storage`); the app turns it into words.
- `ResourceDigester` compresses anything over its level's budget **once per material**, so a large document is paid for once, not on every reply.
- Hand-pasted text has no R2 object.

`ContextBriefBuilder` assembles the three levels:

```
<materials>
<about-me>…</about-me>
<about-project>…</about-project>
<about-meeting>…</about-meeting>
</materials>
```

| Level           | Budget       |
| --------------- | ------------ |
| `about-me`      | 2,000 chars  |
| `about-project` | 4,000 chars  |
| `about-meeting` | 6,000 chars  |
| **Total**       | 10,000 chars |

- **Order is the priority mechanism.** The meeting sits last, closest to the question, and the materials rule says meeting > project > user.
- **Budget cuts from the bottom:** the total is filled starting with the meeting, so `about-me` is cut first and the meeting is never cut.
- Fences come from `common/untrusted`: an uploaded PDF is foreign text like the transcript, and "ignore previous instructions" inside it stays material.
- The brief freezes at start in `Meeting.contextBrief` and in the Redis state. Editing the résumé mid-call does not change the running meeting, and the meeting chat later reads exactly what the assistant saw.

No vector search, on purpose. See [ADR-0010](../decisions/0010-materials-in-prompt-without-retrieval.md).

## Meeting overview

`Meeting.summary` is dense notes for the assistant, useless to a person. The meeting screen shows `Meeting.overview`: at most three sentences on what the meeting was about.

`MeetingOverviewWriter` writes it once after finish. `finish` starts it in the background; `GET /meetings/:id` waits for it if it is not there yet. The running attempt is shared between the two, so it is never paid for twice.

## Meeting chat

Questions about a finished meeting are answered by a small agent, not by stuffing the transcript into a prompt.

```mermaid
sequenceDiagram
    participant U as User
    participant CS as ChatService
    participant A as ChatAgent
    participant L as LlmProvider
    participant T as MeetingToolbox

    U->>CS: question
    CS->>A: context (notes, facts, short transcript) + history + question
    loop up to 6 turns
        A->>L: streamTools(previous_response_id)
        L-->>A: text deltas and/or tool calls
        A->>T: run tool calls
        T-->>A: results
    end
    A-->>CS: answer + summed usage
    CS->>CS: save ChatMessage, UsageRecorder(kind: chat)
```

| Tool                | What it returns                                                              |
| ------------------- | ---------------------------------------------------------------------------- |
| `meeting_facts`     | Start, end, duration, how long each side talked, number of lines and replies |
| `search_transcript` | Lines matching a query                                                       |
| `read_transcript`   | A range of the transcript                                                    |
| `list_answers`      | The replies generated during the meeting                                     |

- A short transcript goes along with the question; a long one is read through tools. That is why "how long was the meeting" has an answer.
- Each turn continues the previous one via `previous_response_id`, so the provider keeps its reasoning and only tool results travel back.
- Everything from the meeting arrives in `<notes>`, `<facts>`, `<transcript>`, `<question>` tags and in tool results, and the system prompt says it is material, not instructions.
- Dates count from the day of **that** meeting, not today: its materials froze then.

See [ADR-0014](../decisions/0014-meeting-chat-as-tool-agent.md).
