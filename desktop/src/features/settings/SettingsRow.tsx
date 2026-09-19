import type { ReactNode } from 'react';

export interface SettingsRowProps {
  label: string;
  hint?: string;
  stacked?: boolean;
  children: ReactNode;
}

export function SettingsRow({
  label,
  hint,
  stacked = false,
  children,
}: SettingsRowProps) {
  return (
    <div
      className={`flex gap-4 border-b border-separator px-4 py-3 ${
        stacked ? 'flex-col items-stretch' : 'items-center justify-between'
      }`}
    >
      <span className="flex flex-col gap-px">
        <span className="text-body text-ink-primary">{label}</span>
        {hint ? <span className="text-caption text-ink-tertiary">{hint}</span> : null}
      </span>
      {children}
    </div>
  );
}
