import type { ReactNode } from 'react';

export interface PanelProps {
  title: string;
  children: ReactNode;
}

export function Panel({ title, children }: PanelProps) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
      <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
      {children}
    </section>
  );
}
