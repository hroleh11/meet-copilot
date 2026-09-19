import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: ReactNode;
}

const STYLES = {
  primary: 'bg-accent text-white hover:brightness-95 disabled:opacity-40',
  secondary:
    'border border-separator bg-surface-elevated text-ink-primary hover:brightness-95 disabled:opacity-40',
  ghost: 'text-accent hover:bg-separator disabled:opacity-40',
  danger: 'bg-danger text-white hover:brightness-95 disabled:opacity-40',
} as const;

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`flex items-center justify-center gap-2 rounded-md px-3 text-body-emphasized transition disabled:cursor-not-allowed ${STYLES[variant]} ${className}`}
    />
  );
}
