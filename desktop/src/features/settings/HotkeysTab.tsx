import { uk } from '~/shared/i18n/uk';
import type { Hotkeys, LocalSettings } from '~/shared/ipc';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';
import { Button, TextInput } from '~/shared/ui';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export interface HotkeysTabProps {
  settings: LocalSettings;
  onSave: (settings: LocalSettings) => void;
}

const LABELS: Record<keyof Hotkeys, string> = {
  reply: uk.settings.hotkeyReply,
  alternative: uk.settings.hotkeyAlternative,
  screenshot: uk.settings.hotkeyScreenshot,
  hide: uk.settings.hotkeyHide,
  interact: uk.settings.hotkeyInteract,
};

const KEYS: (keyof Hotkeys)[] = [
  'reply',
  'alternative',
  'screenshot',
  'hide',
  'interact',
];

export function HotkeysTab({ settings, onSave }: HotkeysTabProps) {
  const [hotkeys, setHotkeys] = useResettableDraft(settings.hotkeys);

  return (
    <div className="flex flex-col gap-3">
      <SettingsGroup title={uk.settings.hotkeys}>
        {KEYS.map((key) => (
          <SettingsRow key={key} label={LABELS[key]}>
            <TextInput
              value={hotkeys[key]}
              aria-label={LABELS[key]}
              onChange={(event) => {
                setHotkeys({ ...hotkeys, [key]: event.target.value });
              }}
              tone="recessed"
              className="h-8 w-[240px]"
            />
          </SettingsRow>
        ))}
      </SettingsGroup>

      <div>
        <Button
          className="h-8"
          onClick={() => {
            onSave({ ...settings, hotkeys });
          }}
        >
          {uk.settings.save}
        </Button>
      </div>
    </div>
  );
}
