import type { ReactNode } from 'react';

export interface OnboardingStepProps {
  title: string;
  hint: string;
  done: boolean;
  children: ReactNode;
}

export function OnboardingStep({ title, hint, done, children }: OnboardingStepProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface-elevated p-5">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${done ? 'bg-success' : 'bg-ink-tertiary'}`}
        />
        <h2 className="text-body font-semibold text-ink-primary">{title}</h2>
      </div>
      <p className="text-body text-ink-secondary">{hint}</p>
      {children}
    </section>
  );
}
