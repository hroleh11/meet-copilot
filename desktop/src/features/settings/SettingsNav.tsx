import type { ComponentType } from 'react';
import { uk } from '~/shared/i18n/uk';
import {
  FolderIcon,
  KeyboardIcon,
  MicrophoneIcon,
  SettingsIcon,
  TerminalIcon,
  type IconProps,
} from '~/shared/ui';

export type SettingsTab = 'general' | 'materials' | 'audio' | 'hotkeys' | 'advanced';

export interface SettingsNavProps {
  tab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

const TABS: { id: SettingsTab; label: string; Icon: ComponentType<IconProps> }[] = [
  { id: 'general', label: uk.settings.tabGeneral, Icon: SettingsIcon },
  { id: 'materials', label: uk.settings.tabMaterials, Icon: FolderIcon },
  { id: 'audio', label: uk.settings.tabAudio, Icon: MicrophoneIcon },
  { id: 'hotkeys', label: uk.settings.tabHotkeys, Icon: KeyboardIcon },
  { id: 'advanced', label: uk.settings.tabAdvanced, Icon: TerminalIcon },
];

export function SettingsNav({ tab, onChange }: SettingsNavProps) {
  return (
    <nav className="flex w-[220px] shrink-0 flex-col gap-1 border-r border-separator bg-surface-secondary p-3">
      {TABS.map(({ id, label, Icon }) => {
        const selected = id === tab;

        return (
          <button
            key={id}
            type="button"
            aria-current={selected}
            onClick={() => {
              onChange(id);
            }}
            className={`flex h-9 items-center gap-3 rounded-md px-3 text-left transition ${
              selected
                ? 'bg-surface-elevated text-body-emphasized text-ink-primary shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                : 'text-body text-ink-secondary hover:bg-surface-primary'
            }`}
          >
            <Icon size={16} className={selected ? 'text-accent' : 'text-ink-tertiary'} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
