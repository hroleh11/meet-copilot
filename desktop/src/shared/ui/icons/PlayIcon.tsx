import type { IconProps } from './MicrophoneIcon';

export function PlayIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}
