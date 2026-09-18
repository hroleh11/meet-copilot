export interface LevelMeterProps {
  level: number;
}

export function LevelMeter({ level }: LevelMeterProps) {
  const clamped = Math.min(1, Math.max(0, level));

  return (
    <div className="h-1 w-full overflow-hidden rounded-sm bg-separator">
      <div
        className="h-full rounded-sm bg-success transition-[width] duration-75 ease-out"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
