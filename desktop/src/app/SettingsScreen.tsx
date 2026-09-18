import { LocalSettingsPanel } from '~/features/settings/LocalSettingsPanel';
import { UserSettingsPanel } from '~/features/settings/UserSettingsPanel';
import type { LocalSettings, UserSettings } from '~/shared/ipc';

export interface SettingsScreenProps {
  local: LocalSettings | null;
  user: UserSettings | null;
  status: string | null;
  onSaveLocal: (settings: LocalSettings) => void;
  onSaveUser: (settings: UserSettings) => void;
  onTestConnection: () => void;
}

export function SettingsScreen({
  local,
  user,
  status,
  onSaveLocal,
  onSaveUser,
  onTestConnection,
}: SettingsScreenProps) {
  return (
    <>
      {local ? (
        <LocalSettingsPanel
          settings={local}
          onSave={onSaveLocal}
          onTestConnection={onTestConnection}
        />
      ) : null}

      {user ? <UserSettingsPanel settings={user} onSave={onSaveUser} /> : null}

      {status ? <p className="text-sm text-emerald-400">{status}</p> : null}
    </>
  );
}
