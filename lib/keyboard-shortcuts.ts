// Shortcuts are written as key lists, e.g. ["Mod", "Shift", "8"], where "Mod" is
// ⌘ on Apple platforms and Ctrl everywhere else (as in TipTap).
export type Shortcut = readonly string[];

type Modifier = 'Mod' | 'Alt' | 'Shift';

// Apple lists modifier symbols as ⌥⇧⌘; elsewhere the convention is Ctrl+Alt+Shift.
const MAC_ORDER: Modifier[] = ['Alt', 'Shift', 'Mod'];
const OTHER_ORDER: Modifier[] = ['Mod', 'Alt', 'Shift'];

const MAC_SYMBOLS: Record<Modifier, string> = { Mod: '⌘', Alt: '⌥', Shift: '⇧' };
const OTHER_LABELS: Record<Modifier, string> = { Mod: 'Ctrl', Alt: 'Alt', Shift: 'Shift' };

function mainKey(keys: Shortcut): string {
  const key = keys.find((k) => !(MAC_ORDER as readonly string[]).includes(k)) ?? '';
  return key.toUpperCase();
}

function modifiersIn(keys: Shortcut, order: Modifier[]): Modifier[] {
  return order.filter((modifier) => keys.includes(modifier));
}

// "⇧⌘8" on Apple platforms, "Ctrl+Shift+8" elsewhere.
export function formatShortcut(keys: Shortcut, isMac: boolean): string {
  if (isMac) {
    return (
      modifiersIn(keys, MAC_ORDER)
        .map((m) => MAC_SYMBOLS[m])
        .join('') + mainKey(keys)
    );
  }
  return [...modifiersIn(keys, OTHER_ORDER).map((m) => OTHER_LABELS[m]), mainKey(keys)].join('+');
}

// The aria-keyshortcuts value: "Meta+Shift+8" on Apple platforms,
// "Control+Shift+8" elsewhere. The main key must come last.
export function toAriaKeyShortcuts(keys: Shortcut, isMac: boolean): string {
  const names: Record<Modifier, string> = {
    Mod: isMac ? 'Meta' : 'Control',
    Alt: 'Alt',
    Shift: 'Shift',
  };
  return [...modifiersIn(keys, OTHER_ORDER).map((m) => names[m]), mainKey(keys)].join('+');
}
