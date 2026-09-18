import { uk } from '~/shared/i18n/uk';
import { ChevronRightIcon, SettingsIcon } from '~/shared/ui';

export interface TitleBarProps {
  title: string;
  onBack: (() => void) | null;
  onOpenSettings: () => void;
}

export function TitleBar({ title, onBack, onOpenSettings }: TitleBarProps) {
  return (
    <header
      data-tauri-drag-region
      className="relative flex h-13 shrink-0 items-center border-b border-separator bg-surface-secondary pr-4 pl-[88px]"
    >
      {onBack ? (
        <button
          type="button"
          aria-label={uk.nav.back}
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-ink-secondary transition hover:bg-separator"
        >
          <ChevronRightIcon size={16} className="rotate-180" />
        </button>
      ) : null}

      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-body-emphasized text-ink-primary">
        {title}
      </span>

      <button
        type="button"
        aria-label={uk.nav.settings}
        onClick={onOpenSettings}
        className="ml-auto flex h-7 w-7 items-center justify-center rounded-sm text-ink-secondary transition hover:bg-separator"
      >
        <SettingsIcon />
      </button>
    </header>
  );
}
