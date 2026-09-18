import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  children: ReactNode;
}

const STYLES = {
  primary:
    'bg-neutral-100 text-neutral-900 hover:bg-white disabled:bg-neutral-700 disabled:text-neutral-400',
  ghost:
    'border border-neutral-700 text-neutral-200 hover:border-neutral-500 disabled:text-neutral-500',
} as const;

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${STYLES[variant]} ${className}`}
    />
  );
}
