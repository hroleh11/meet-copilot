import { useEffect, useRef } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { Speaker } from '~/shared/ipc';
import type { TranscriptLine } from '~/shared/store/sessionStore';
import { Panel } from '~/shared/ui';

export interface TranscriptPanelProps {
  lines: TranscriptLine[];
}

const SPEAKER: Record<Speaker, string> = {
  me: uk.meeting.me,
  other: uk.meeting.other,
};

const BOTTOM_TOLERANCE_PX = 32;

function isAtBottom(element: HTMLDivElement): boolean {
  const distance = element.scrollHeight - element.scrollTop - element.clientHeight;

  return distance <= BOTTOM_TOLERANCE_PX;
}

export function TranscriptPanel({ lines }: TranscriptPanelProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const stuckToBottom = useRef(true);

  useEffect(() => {
    const element = viewport.current;

    if (element && stuckToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [lines]);

  return (
    <Panel title={uk.transcript.title}>
      {lines.length === 0 ? (
        <p className="text-sm text-neutral-500">{uk.meeting.emptyTranscript}</p>
      ) : (
        <div
          ref={viewport}
          onScroll={(event) => {
            stuckToBottom.current = isAtBottom(event.currentTarget);
          }}
          className="flex max-h-80 flex-col gap-2 overflow-y-auto"
        >
          {lines.map((line) => (
            <p
              key={line.id}
              className={`text-sm ${line.isFinal ? 'text-neutral-200' : 'text-neutral-500 italic'}`}
            >
              <span className="mr-2 text-xs tracking-wide text-neutral-500 uppercase">
                {SPEAKER[line.speaker]}
              </span>
              {line.text}
            </p>
          ))}
        </div>
      )}
    </Panel>
  );
}
