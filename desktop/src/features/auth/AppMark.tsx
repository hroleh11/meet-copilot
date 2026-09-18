import { MicrophoneIcon, SparkleIcon } from '~/shared/ui';

export function AppMark() {
  return (
    <span className="relative flex h-14 w-14 items-center justify-center rounded-lg bg-accent text-white shadow-[0_8px_20px_rgba(0,122,255,0.35)]">
      <MicrophoneIcon />
      <SparkleIcon className="absolute -top-1 -right-1" />
    </span>
  );
}
