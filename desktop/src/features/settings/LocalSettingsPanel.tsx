import type { LocalSettings } from '~/shared/ipc';
import { uk } from '~/shared/i18n/uk';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';
import { Button, Field, Panel } from '~/shared/ui';

export interface LocalSettingsPanelProps {
  settings: LocalSettings;
  onSave: (settings: LocalSettings) => void;
  onTestConnection: () => void;
}

export function LocalSettingsPanel({
  settings,
  onSave,
  onTestConnection,
}: LocalSettingsPanelProps) {
  const [backendUrl, setBackendUrl] = useResettableDraft(settings.backendUrl);

  return (
    <Panel title={uk.settings.local}>
      <Field label={uk.settings.backendUrl}>
        <input
          value={backendUrl}
          onChange={(event) => {
            setBackendUrl(event.target.value);
          }}
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />
      </Field>

      <div className="flex gap-2">
        <Button
          onClick={() => {
            onSave({ ...settings, backendUrl });
          }}
        >
          {uk.settings.save}
        </Button>
        <Button variant="ghost" onClick={onTestConnection}>
          {uk.settings.checkConnection}
        </Button>
      </div>
    </Panel>
  );
}
