# ADR-0007: A byte-stable prompt prefix for caching

**Status:** accepted

## Context

A meeting can last hours and the user may press the hotkey dozens of times. Each request sends the persona, profile, style and materials — thousands of tokens that never change. OpenAI caches a repeated prefix automatically, and cached input tokens cost about a tenth of fresh ones and are faster.

## Decision

- Everything stable goes into the system text: persona, profile prompt, style, materials rule, context brief, reply-language instruction.
- Style, context brief and today's date **freeze into the meeting state at start**. Editing settings or materials mid-meeting does not change the running meeting.
- The conversation is only appended to; the rolling summary is the first message.
- Anything that changes per request (the mode instruction, the date note) goes into the **last** message.

## Alternatives considered

- **Reading settings and materials fresh on every request.** Always current, but every edit would bust the cache.
- **Retrieval per request.** Would make the prefix different every time.

## Consequences

- A high cached share of input tokens and lower latency.
- A mid-meeting change of style or materials takes effect only at the next meeting.
- The meeting chat reads the same frozen brief and sees exactly what the assistant saw.
