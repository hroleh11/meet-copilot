import { useState } from 'react';
import { AdvancedTab } from '~/features/settings/AdvancedTab';
import { AudioTab } from '~/features/settings/AudioTab';
import { GeneralTab } from '~/features/settings/GeneralTab';
import { HotkeysTab } from '~/features/settings/HotkeysTab';
import { MaterialsTab } from '~/features/settings/MaterialsTab';
import { SettingsNav, type SettingsTab } from '~/features/settings/SettingsNav';
import type { LocalSettings, UserSettings } from '~/shared/ipc';

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
  const [tab, setTab] = useState<SettingsTab>('general');

  return (
    <div className="flex min-h-0 flex-grow">
      <SettingsNav tab={tab} onChange={setTab} />

      <div className="min-h-0 flex-grow overflow-y-auto p-5">
        <div className="mx-auto flex max-w-[640px] flex-col gap-5">
          {tab === 'general' && user ? (
            <GeneralTab
              settings={user}
              email={email}
              onSave={onSaveUser}
              onSignOut={onSignOut}
            />
          ) : null}

          {tab === 'materials' ? <MaterialsTab /> : null}

          {tab === 'audio' && local ? (
            <AudioTab settings={local} onSave={onSaveLocal} />
          ) : null}

          {tab === 'hotkeys' && local ? (
            <HotkeysTab settings={local} onSave={onSaveLocal} />
          ) : null}

          {tab === 'advanced' && local ? (
            <AdvancedTab
              settings={local}
              onSave={onSaveLocal}
              onTestConnection={onTestConnection}
            />
          ) : null}

          {status ? <p className="text-body text-success">{status}</p> : null}
        </div>
      </div>
    </div>
  );
}
