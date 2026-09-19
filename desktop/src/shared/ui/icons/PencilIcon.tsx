import type { IconProps } from './MicrophoneIcon';

export function PencilIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4" />
    </svg>
  );
}
