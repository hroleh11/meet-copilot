import { uk } from '~/shared/i18n/uk';
import type { Hotkeys } from '~/shared/ipc';
import { Field } from '~/shared/ui';

export interface HotkeysFieldProps {
  hotkeys: Hotkeys;
  onChange: (hotkeys: Hotkeys) => void;
}

const inputClass =
  'rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500';

const LABELS: Record<keyof Hotkeys, string> = {
  reply: uk.settings.hotkeyReply,
  alternative: uk.settings.hotkeyAlternative,
  hide: uk.settings.hotkeyHide,
};

const KEYS: (keyof Hotkeys)[] = ['reply', 'alternative', 'hide'];

export function HotkeysField({ hotkeys, onChange }: HotkeysFieldProps) {
  return (
    <Field label={uk.settings.hotkeys}>
      <div className="flex flex-col gap-2">
        {KEYS.map((key) => (
          <label key={key} className="flex items-center gap-3">
            <span className="w-56 text-sm text-neutral-400">{LABELS[key]}</span>
            <input
              value={hotkeys[key]}
              onChange={(event) => {
                onChange({ ...hotkeys, [key]: event.target.value });
              }}
              className={`${inputClass} flex-1`}
            />
          </label>
        ))}
      </div>
    </Field>
  );
}
