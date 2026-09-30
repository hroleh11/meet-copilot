# ADR-0010: Materials on three levels, whole in the prompt, no vector search

**Status:** accepted

## Context

Replies are much better when the assistant knows the user's résumé, the job description and the plan for this call. These come at different levels: about the user, about a project, about one meeting. They can disagree. Meeting materials should be uploadable before the meeting exists.

## Decision

- A `Resource` is a standalone user object with `scope: user | project | meeting`. Meeting materials are uploaded with no `meetingId` and claimed by `POST /meetings` right after it creates the meeting row. Unclaimed ones are swept after a day.
- Originals in Cloudflare R2 behind `ObjectStorage`; extracted text and digest in Postgres, so nothing reads R2 during a meeting.
- Text over its level's budget is digested **once** by the summary model.
- `ContextBriefBuilder` joins levels in the order user → project → meeting, inside fences, with budgets 2,000 / 4,000 / 6,000 characters and a 10,000 total that cuts from `about-me` first.
- Priority is stated in the prompt: meeting > project > user; what is said aloud beats all.
- No vector search.

## Alternatives considered

- **Retrieval (pgvector) per reply.** A résumé, a job description and project notes are a few thousand tokens and fit whole; retrieval would make the prefix different every time and kill the cache that gives the largest saving.
- **A draft meeting to attach files to.** Adds a new status to the meeting state machine for no gain.
- **Letting the model resolve conflicts.** Unpredictable.

## Consequences

- Preparation happens while the user picks a profile, with no draft meetings.
- A large document costs once.
- Scans without a text layer fail with `no_text_layer`; there is no OCR.
- The place for retrieval is ready: the meeting chat already works with tools and is not latency-bound.
