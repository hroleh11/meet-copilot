# ADR-0003: Postgres for what must survive, Redis for what is read on every keypress

**Status:** accepted

## Context

During a live meeting every hotkey press reads the meeting's style, brief, summary, recent transcript and conversation turns. These change constantly and must be read in a few milliseconds. At the same time the transcript, replies and history must never be lost.

## Decision

- **PostgreSQL** (via Prisma) stores users, meetings, final segments, generations, chats, materials and usage.
- **Redis** stores the live meeting state (`meeting:{id}:state`, `window`, `summary`, `turns`, locks, heartbeat), cached user settings and one-time login codes. Everything has a TTL.
- Only `MeetingStateStore` knows meeting keys.
- Meeting status lives only in Postgres, to avoid two sources of truth.

## Alternatives considered

- **Postgres only.** Simpler, but a hot path of several queries per keypress and no natural place for locks and TTLs.
- **In-process memory.** Fastest, but lost on restart and impossible to scale to more than one instance.

## Consequences

- Everything in Redis can be rebuilt from Postgres; losing Redis loses only the live context of running meetings.
- Summarization is guarded by a Redis lock, so two instances never summarize one meeting at once.
- Stale meetings are detected by an expiring heartbeat key instead of polling timestamps.
