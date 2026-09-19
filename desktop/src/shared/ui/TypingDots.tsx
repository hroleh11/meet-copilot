const DELAYS = ['0ms', '150ms', '300ms'];

export interface TypingDotsProps {
  label: string;
}

export function TypingDots({ label }: TypingDotsProps) {
  return (
    <span role="status" aria-label={label} className="flex h-5 items-center gap-1">
      {DELAYS.map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: delay }}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-tertiary"
        />
      ))}
    </span>
  );
}
