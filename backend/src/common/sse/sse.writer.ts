import type { Response } from 'express';

/// Every stream the backend serves is the same shape: text arrives in deltas and
/// the last event says how it ended.
export interface SseEvent {
  type: string;
  data: unknown;
}

export function openSseStream(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
}

export function writeSseEvent(res: Response, event: SseEvent): void {
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
}
