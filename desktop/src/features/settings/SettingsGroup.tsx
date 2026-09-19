import type { ReactNode } from 'react';
import { SectionLabel } from '~/shared/ui';

export interface SettingsGroupProps {
  title: string;
  children: ReactNode;
}

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>{title}</SectionLabel>
      <div className="flex flex-col rounded-lg border border-separator bg-surface-elevated [&>*:last-child]:border-b-0">
        {children}
      </div>
    </section>
  );
}
