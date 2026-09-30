# A live meeting end to end

This page follows one meeting from the Start button to the history screen and names the code responsible at each step.

## 1. Start

```mermaid
sequenceDiagram
    autonumber
    participant UI as React UI
    participant App as src-tauri
    participant Core as core::Session
    participant BE as Backend
    participant PG as Postgres
    participant RD as Redis

    UI->>App: start_session(profile, language, project, resourceIds)
    App->>Core: AccessPolicy::check()
    Core->>BE: POST /meetings
    BE->>PG: create Meeting
    BE->>PG: claim staged resources
    BE->>BE: ContextBriefBuilder: materials → brief
    BE->>PG: Meeting.contextBrief
    BE->>RD: meeting:{id}:state (style, brief, today, language, profile)
    BE-->>Core: { id, status, startedAt }
    Core->>Core: open audio sources, one lane per speaker
    Core-->>UI: session:state = Listening, source:status × 2
```

What matters here:

- The **context brief, style and today's date freeze** into the meeting state at start. The system part of the prompt stays byte-for-byte the same for the whole meeting, so OpenAI's prefix cache keeps working. See [ADR-0007](../decisions/0007-stable-prompt-prefix.md).
- Materials for the meeting were uploaded **before** the meeting existed, as resources with `scope: meeting` and no `meetingId`. `POST /meetings` claims them right after creating the row. These are sequential steps, not one transaction: if a listed id is unknown, the request fails with 404 after the meeting row already exists. See [ADR-0010](../decisions/0010-materials-in-prompt-without-retrieval.md).
- Missing system audio does not block the start. The meeting runs with the microphone alone, and the reason comes back in `systemAudioProblem`.
- A failure during `Starting` returns to `Idle` and finishes the meeting on the backend if it was already created.

## 2. Listening

```mermaid
sequenceDiagram
    participant Src as AudioSource
    participant Lane as Lane (me / other)
    participant WS as Backend SttServer
    participant DG as Deepgram
    participant Sum as Summarizer

    loop every 100 ms
        Src->>Lane: AudioFrame (16 kHz mono i16)
        Lane->>WS: binary frame
        WS->>DG: PCM
    end
    DG-->>WS: interim result
    WS-->>Lane: { type: partial }
    DG-->>WS: final result
    WS->>WS: save Segment (Postgres) + push to window (Redis)
    WS-->>Lane: { type: final }
    WS-)Sum: maybe summarize (background)
```

- Each speaker has its own **lane**: its own audio source, resampler and WebSocket. Speakers are known from the source, not guessed by diarization. See [ADR-0004](../decisions/0004-one-stream-per-speaker.md).
- Only **final** segments are stored. Interim ones go straight back to the client for display.
- After each final segment the `Summarizer` checks whether the text outside the window exceeds `SUMMARY_TRIGGER_CHARS`. If so, and the Redis lock is free, it compresses that part into the rolling summary in the background. Recognition never waits for it.
- While audio flows, the stream refreshes `meeting:{id}:alive`. If that key expires, `StaleMeetingsCloser` treats the meeting as abandoned.
- A dropped socket does not end the meeting: the lane reopens with backoff, up to five attempts. Codes 4401 and 4404 are not retried.

### Switching language

`PATCH /meetings/:id { language }` updates the row and the Redis state. The session exposes a `watch` channel; the lanes see the change, flush and close their sockets, and open new ones. The backend reads the language from the meeting row on connect. Audio sources never stop, so no phrase is lost.

## 3. Asking for a reply

```mermaid
sequenceDiagram
    autonumber
    participant K as Hotkey
    participant Gen as core::Generator
    participant BE as GenerationService
    participant RD as Redis
    participant PB as PromptBuilder
    participant OAI as OpenAI
    participant OV as Overlay

    K->>Gen: reply / alternative / screenshot
    Gen->>Gen: cancel previous request, AccessPolicy::check()
    Gen->>BE: POST /meetings/:id/generate { mode, screenshot? }
    BE->>BE: check owner and status (plain HTTP error if wrong)
    BE->>RD: read state, summary, window, turns
    BE->>PB: build conversation
    PB-->>BE: system text + messages
    BE->>OAI: stream
    Gen-->>OV: generation:started
    loop tokens
        OAI-->>BE: delta
        BE-->>Gen: SSE delta
        Gen-->>OV: generation:delta
    end
    BE->>BE: save Generation, append turn, move spokenUpTo
    BE->>BE: UsageRecorder
    BE-->>Gen: SSE done { generationId, usage }
    Gen-->>OV: generation:finished
```

- The prompt is a **conversation with roles**, not one big block. Each turn is "what was said since the previous draft" (user) and "the draft we gave" (assistant). How it is assembled: [AI pipeline](../backend/ai-pipeline.md#promptbuilder).
- `alternative` rewrites the last turn instead of adding a new one, so retries do not pile up in history.
- A **screenshot** rides in the request body and lands inside the turn it came with. Only the newest image stays in the turn log. See [ADR-0011](../decisions/0011-in-process-screen-capture.md).
- If the client disconnects, the provider request is cancelled and the partial reply is still saved.

## 4. Stop

```mermaid
sequenceDiagram
    participant UI
    participant Core as core::Session
    participant WS as Backend SttServer
    participant DG as Deepgram
    participant BE as MeetingsService

    UI->>Core: stop_session
    Core->>Core: cancel running generation
    Core->>WS: { type: finish } on every lane
    WS->>DG: close stream, wait for flush
    DG-->>WS: last final segments
    WS-->>Core: final segments, then close 1000
    Core->>BE: POST /meetings/:id/finish
    BE->>BE: status finished, TTL on state/window/summary,<br/>delete turns and alive
    BE-)BE: MeetingOverviewWriter (background)
    Core-->>UI: session:state = Idle
```

- The client ends a lane with a text `finish` message, not by dropping the socket. Deepgram only returns the last phrase after a flush, so dropping would lose it. The client keeps reading with a 5-second safeguard.
- The overlay empties: an `Idle` session holds neither transcript nor reply.
- Quitting the app mid-meeting goes through `RunEvent::Exit`, which stops the session and finishes the meeting within 5 seconds.

## 5. After the meeting

- `MeetingOverviewWriter` writes the three-sentence overview once, in the background. `GET /meetings/:id` waits for it if it is not ready yet; the running attempt is shared, so it is never paid for twice.
- The meeting screen reads `GET /meetings/:id`: overview, segments, generations, resources, usage.
- The meeting chat is a tool-using agent over the finished meeting. See [AI pipeline](../backend/ai-pipeline.md#meeting-chat).
- Redis keys of the meeting expire after `FINISHED_MEETING_TTL_SECONDS`. Postgres keeps everything.
