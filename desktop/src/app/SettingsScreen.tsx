import { LocalSettingsPanel } from '~/features/settings/LocalSettingsPanel';
import { UserSettingsPanel } from '~/features/settings/UserSettingsPanel';
import { uk } from '~/shared/i18n/uk';
import type { LocalSettings, UserSettings } from '~/shared/ipc';
import { Button } from '~/shared/ui';

export interface SettingsScreenProps {
  local: LocalSettings | null;
  user: UserSettings | null;
  status: string | null;
  email: string | null;
  onSaveLocal: (settings: LocalSettings) => void;
  onSaveUser: (settings: UserSettings) => void;
  onTestConnection: () => void;
  onSignOut: () => void;
}

export function SettingsScreen({
  local,
  user,
  status,
  email,
  onSaveLocal,
  onSaveUser,
  onTestConnection,
  onSignOut,
}: SettingsScreenProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      {local ? (
        <LocalSettingsPanel
          settings={local}
          onSave={onSaveLocal}
          onTestConnection={onTestConnection}
        />
      ) : null}

      {user ? <UserSettingsPanel settings={user} onSave={onSaveUser} /> : null}

      {status ? <p className="text-body text-success">{status}</p> : null}

      <div className="flex items-center justify-between">
        <span className="text-body text-ink-secondary">
          {uk.auth.signedInAs} {email}
        </span>
        <Button variant="secondary" className="h-8" onClick={onSignOut}>
          {uk.auth.signOut}
        </Button>
      </div>
    </div>
  );
}
