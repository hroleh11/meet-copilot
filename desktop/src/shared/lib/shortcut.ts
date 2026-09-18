const SYMBOLS: Record<string, string> = {
  CommandOrControl: '⌘',
  Command: '⌘',
  Control: '⌃',
  Ctrl: '⌃',
  Alt: '⌥',
  Option: '⌥',
  Shift: '⇧',
  Space: '␣',
};

export function formatShortcut(shortcut: string): string {
  return shortcut
    .split('+')
    .map((part) => SYMBOLS[part] ?? part.toUpperCase())
    .join(' ');
}
