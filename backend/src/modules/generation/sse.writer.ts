import type { Response } from 'express';
import type { GenerationEvent } from './types/generation.types';

export function openSseStream(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
}

export function writeSseEvent(res: Response, event: GenerationEvent): void {
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
}
