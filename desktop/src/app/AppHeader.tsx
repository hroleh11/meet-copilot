import { uk } from '~/shared/i18n/uk';
import { Button } from '~/shared/ui';

export type Tab = 'meeting' | 'history' | 'settings';

export interface AppHeaderProps {
  email: string | null;
  tab: Tab;
  onTab: (tab: Tab) => void;
  onSignOut: () => void;
}

const TABS: Tab[] = ['meeting', 'history', 'settings'];

const LABEL: Record<Tab, string> = {
  meeting: uk.nav.meeting,
  history: uk.nav.history,
  settings: uk.nav.settings,
};

export function AppHeader({ email, tab, onTab, onSignOut }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{uk.appName}</h1>
          <p className="text-sm text-neutral-400">
            {uk.auth.signedInAs} {email}
          </p>
        </div>
        <Button variant="ghost" onClick={onSignOut}>
          {uk.auth.signOut}
        </Button>
      </div>

      <nav className="flex gap-1 rounded-lg border border-neutral-800 p-1">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={name === tab}
            onClick={() => {
              onTab(name);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm transition ${
              name === tab
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {LABEL[name]}
          </button>
        ))}
      </nav>
    </header>
  );
}
