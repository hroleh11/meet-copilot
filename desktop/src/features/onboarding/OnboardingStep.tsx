import type { ReactNode } from 'react';

export interface OnboardingStepProps {
  title: string;
  hint: string;
  done: boolean;
  children: ReactNode;
}

export function OnboardingStep({ title, hint, done, children }: OnboardingStepProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${done ? 'bg-emerald-500' : 'bg-neutral-600'}`}
        />
        <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
      </div>
      <p className="text-sm text-neutral-400">{hint}</p>
      {children}
    </section>
  );
}
