import { uk } from '~/shared/i18n/uk';
import type { LocalSettings } from '~/shared/ipc';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';
import { Button, TextInput } from '~/shared/ui';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export interface AdvancedTabProps {
  settings: LocalSettings;
  onSave: (settings: LocalSettings) => void;
  onTestConnection: () => void;
}

export function AdvancedTab({ settings, onSave, onTestConnection }: AdvancedTabProps) {
  const [backendUrl, setBackendUrl] = useResettableDraft(settings.backendUrl);

  return (
    <div className="flex flex-col gap-3">
      <SettingsGroup title={uk.settings.groupServer}>
        <SettingsRow label={uk.settings.backendUrl}>
          <TextInput
            value={backendUrl}
            aria-label={uk.settings.backendUrl}
            onChange={(event) => {
              setBackendUrl(event.target.value);
            }}
            tone="recessed"
            className="h-8 w-[320px]"
          />
        </SettingsRow>
      </SettingsGroup>

      <div className="flex gap-2">
        <Button
          className="h-8"
          onClick={() => {
            onSave({ ...settings, backendUrl });
          }}
        >
          {uk.settings.save}
        </Button>
        <Button variant="ghost" className="h-8" onClick={onTestConnection}>
          {uk.settings.checkConnection}
        </Button>
      </div>
    </div>
  );
}
