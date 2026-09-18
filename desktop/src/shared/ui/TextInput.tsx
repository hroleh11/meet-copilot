import type { InputHTMLAttributes } from 'react';

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className = '', ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded-md border border-separator bg-surface-elevated px-3 text-body text-ink-primary outline-none placeholder:text-ink-tertiary focus:border-accent ${className}`}
    />
  );
}
