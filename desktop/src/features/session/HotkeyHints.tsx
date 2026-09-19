import { uk } from '~/shared/i18n/uk';
import { formatShortcut } from '~/shared/lib/shortcut';

export interface HotkeyHintsProps {
  reply: string;
  screenshot: string;
}

export function HotkeyHints({ reply, screenshot }: HotkeyHintsProps) {
  return (
    <div className="flex flex-col gap-1 text-center text-caption text-ink-tertiary">
      <span>{uk.meeting.hotkeyHint.replace('{hotkey}', formatShortcut(reply))}</span>
      <span>
        {uk.meeting.screenshotHint.replace('{hotkey}', formatShortcut(screenshot))}
      </span>
    </div>
  );
}
