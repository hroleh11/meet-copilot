# ADR-0008: The prompt is a conversation with turns, not one block

**Status:** accepted

## Context

Early versions put the summary, the transcript and the screenshot into one user message. When a screenshot of a console with a Promise arrived next to a question about React, the model linked them — from its point of view they arrived together. No wording in the prompt could fix that.

## Decision

`PromptBuilder` builds a conversation:

- A **turn** is "what was said since the previous draft" (user) and "the draft we gave" (assistant).
- `spokenUpTo` in the meeting state marks the last segment the model has seen.
- The current question is the last message; a screenshot sits inside the turn it came with.
- `alternative` rewrites the last turn instead of adding one.
- The log keeps six turns and only the newest screenshot; a request never carries more than one image.

## Alternatives considered

- **One block with instructions about the screenshot.** Tried; the structure still said they belonged together.
- **Dropping the screenshot after one reply.** Breaks follow-ups like "and why?".

## Consequences

- Follow-ups see the same screen; a change of topic does not drag the image along.
- The model sees its own previous drafts and does not repeat them.
- Retries do not pile up in history.
- The turn log is extra Redis state (`meeting:{id}:turns`).
