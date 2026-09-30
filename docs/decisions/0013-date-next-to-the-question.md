# ADR-0013: Today's date sits next to the question, not in the system text

**Status:** accepted

## Context

A résumé says "Feb 2025 — Present". Without a date the model measures from its own horizon: asked about years of experience it answered "about a year" to a document showing almost two.

## Decision

The day freezes into the meeting state at start. `todayNote` goes into the **last** message, next to the mode instruction, and says: "Today is …. Before naming a span of time, add up every date range in the materials, counting an open one up to today." The meeting chat uses the day of that meeting, not today.

## Measurements

| Placement                                        | Answer on a real résumé                         |
| ------------------------------------------------ | ----------------------------------------------- |
| Date in the system text                          | "about a year and a half"                       |
| Date next to the question                        | "a year and seven months" (only the last range) |
| Date + "add up every range" next to the question | a year and nine months — correct                |

## Consequences

- Correct spans of experience.
- The system text does not change, so the cached prefix stays intact ([ADR-0007](0007-stable-prompt-prefix.md)).
