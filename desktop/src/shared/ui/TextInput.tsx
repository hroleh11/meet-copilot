import type { InputHTMLAttributes } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  tone?: 'elevated' | 'recessed';
}

const TONES = {
  elevated: 'bg-surface-elevated',
  recessed: 'bg-surface-primary',
} as const;

export function TextInput({
  tone = 'elevated',
  className = '',
  ...props
}: TextInputProps) {
  return (
    <input
      {...props}
      className={`h-9 rounded-md border border-separator px-3 text-body text-ink-primary outline-none placeholder:text-ink-tertiary focus:border-accent ${TONES[tone]} ${className}`}
    />
  );
}
