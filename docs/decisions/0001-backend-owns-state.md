# ADR-0001: The backend owns all state; the app is a thin client

**Status:** accepted

## Context

A meeting assistant needs provider keys (OpenAI, Deepgram), prompts that improve over time, a history visible from any machine, and eventually a paid subscription. A desktop binary on the user's disk is not trusted: anything inside it can be extracted, and any local check can be cut out.

## Decision

The NestJS backend owns users, meetings, transcripts, summaries, settings, prompts and provider keys. The desktop app captures audio, shows the transcript and replies, and handles hotkeys and windows. It has no local database and never talks to providers.

## Alternatives considered

- **Fat client calling providers directly.** Lower latency by one hop, but keys would ship in the binary and prompts could not change without a release.
- **Local database with sync.** Offline history, but two sources of truth and a sync protocol for a product that cannot work offline anyway.

## Consequences

- Keys never leave the server; prompts and models change with a deploy, not a release.
- The subscription can be enforced in one place (`SubscriptionGuard`).
- Every feature needs the network; one extra hop sits between the app and the providers.
- The API contract between the two parts is the most important document, and both sides mirror its types.
