import type { ReactNode } from 'react';

export interface ChatBubbleProps {
  side: 'me' | 'assistant';
  time: string | null;
  children: ReactNode;
}

const SIDES = {
  me: 'self-end rounded-br-sm bg-accent text-white',
  assistant:
    'self-start rounded-bl-sm border border-separator bg-surface-elevated text-ink-primary',
} as const;

const TIMES = {
  me: 'text-white/70',
  assistant: 'text-ink-tertiary',
} as const;

export function ChatBubble({ side, time, children }: ChatBubbleProps) {
  return (
    <div
      className={`flex max-w-[80%] flex-col gap-1 rounded-2xl px-3.5 py-2 ${SIDES[side]}`}
    >
      <div className="text-body whitespace-pre-wrap">{children}</div>
      {time ? (
        <span className={`self-end text-caption ${TIMES[side]}`}>{time}</span>
      ) : null}
    </div>
  );
}
