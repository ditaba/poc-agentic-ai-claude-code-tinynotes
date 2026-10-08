import { describe, expect, test } from 'bun:test';
import { formatShortcut, toAriaKeyShortcuts } from './keyboard-shortcuts';

describe('formatShortcut', () => {
  test("uses symbols in Apple's modifier order on Mac", () => {
    expect(formatShortcut(['Mod', 'b'], true)).toBe('⌘B');
    expect(formatShortcut(['Mod', 'Shift', '8'], true)).toBe('⇧⌘8');
    expect(formatShortcut(['Mod', 'Alt', '1'], true)).toBe('⌥⌘1');
  });

  test('uses Ctrl and plus signs elsewhere', () => {
    expect(formatShortcut(['Mod', 'b'], false)).toBe('Ctrl+B');
    expect(formatShortcut(['Mod', 'Shift', '8'], false)).toBe('Ctrl+Shift+8');
    expect(formatShortcut(['Mod', 'Alt', 'c'], false)).toBe('Ctrl+Alt+C');
  });

  test('normalizes the order of modifiers', () => {
    expect(formatShortcut(['Shift', 'Mod', 'z'], false)).toBe('Ctrl+Shift+Z');
    expect(formatShortcut(['Shift', 'Mod', 'z'], true)).toBe('⇧⌘Z');
  });
});

describe('toAriaKeyShortcuts', () => {
  test('maps Mod to Meta on Mac and Control elsewhere', () => {
    expect(toAriaKeyShortcuts(['Mod', 'b'], true)).toBe('Meta+B');
    expect(toAriaKeyShortcuts(['Mod', 'b'], false)).toBe('Control+B');
  });

  test('keeps the main key last', () => {
    expect(toAriaKeyShortcuts(['Mod', 'Shift', '8'], false)).toBe('Control+Shift+8');
    expect(toAriaKeyShortcuts(['Mod', 'Alt', '1'], true)).toBe('Meta+Alt+1');
  });
});
