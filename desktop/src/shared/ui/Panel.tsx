import type { ReactNode } from 'react';

export interface PanelProps {
  title: string;
  children: ReactNode;
}

export function Panel({ title, children }: PanelProps) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-separator bg-surface-elevated p-4">
      <h2 className="text-headline text-ink-primary">{title}</h2>
      {children}
    </section>
  );
}
