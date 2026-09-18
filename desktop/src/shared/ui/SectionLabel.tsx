export interface SectionLabelProps {
  children: string;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <span className="text-caption font-semibold tracking-wide text-ink-secondary uppercase">
      {children}
    </span>
  );
}
