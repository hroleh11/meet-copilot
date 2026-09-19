import type { IconProps } from './MicrophoneIcon';

export function TerminalIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 17l6-5-6-5" />
      <path d="M13 19h7" />
    </svg>
  );
}
