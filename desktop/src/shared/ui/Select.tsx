import { ChevronDownIcon } from './icons';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  label: string;
  options: SelectOption<T>[];
  value: T;
  disabled?: boolean;
  tone?: 'elevated' | 'recessed';
  className?: string;
  onChange: (value: T) => void;
}

const TONES = {
  elevated: 'bg-surface-elevated',
  recessed: 'bg-surface-primary',
} as const;

export function Select<T extends string>({
  label,
  options,
  value,
  disabled = false,
  tone = 'elevated',
  className = '',
  onChange,
}: SelectProps<T>) {
  return (
    <div
      className={`relative flex h-8 items-center rounded-sm border border-separator px-3 ${TONES[tone]} ${className}`}
    >
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value as T);
        }}
        className="w-full appearance-none bg-transparent pr-5 text-body text-ink-primary outline-none disabled:opacity-40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 text-ink-tertiary" />
    </div>
  );
}
