export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  disabled = false,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-px rounded-md bg-surface-primary p-px"
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => {
              onChange(option.value);
            }}
            className={`flex-grow rounded-sm px-2 py-1 text-caption transition disabled:cursor-not-allowed disabled:opacity-40 ${
              selected
                ? 'bg-surface-elevated font-semibold text-ink-primary shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                : 'text-ink-secondary'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
