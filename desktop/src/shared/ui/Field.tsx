import type { ReactNode } from 'react';

export interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption font-semibold text-ink-secondary">{label}</span>
      {children}
      {hint ? <span className="text-caption text-ink-tertiary">{hint}</span> : null}
    </label>
  );
}
