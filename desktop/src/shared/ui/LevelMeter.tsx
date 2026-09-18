export interface LevelMeterProps {
  level: number;
}

export function LevelMeter({ level }: LevelMeterProps) {
  const clamped = Math.min(1, Math.max(0, level));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
      <div
        className="h-full rounded-full bg-emerald-500 transition-[width] duration-75 ease-out"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
