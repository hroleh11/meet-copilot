# ADR-0014: The meeting chat is a tool-using agent

**Status:** accepted

## Context

After a meeting, users ask things like "how long was it?", "how much did I talk?", "what did they ask about Kubernetes?". A long transcript does not fit the prompt, and facts like duration are not in the transcript text at all.

## Decision

`ChatAgent` runs up to six turns with tools from `MeetingToolbox`:

- `meeting_facts` — start, end, duration, talk time per side, counts;
- `search_transcript`, `read_transcript`;
- `list_answers`.

A short transcript goes along with the question; a long one is read through tools. Each turn continues the previous via `previous_response_id`. Meeting content arrives in tags and is declared material, not instructions. Messages are stored in `chat_messages`; usage of all turns is summed under `chat`.

## Alternatives considered

- **Whole transcript in the prompt.** Breaks on long meetings and cannot answer "how long".
- **A precomputed summary.** Loses detail the user asks about.
- **Vector search.** Not needed yet; it can become another tool.

## Consequences

- Precise answers about duration and talk time.
- Latency is higher than for live replies, which is acceptable after the meeting.
- The chat is the natural place for future retrieval over materials.
