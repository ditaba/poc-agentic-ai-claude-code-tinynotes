import { describe, expect, test } from 'vitest';
import { nextIndex } from './use-roving-focus';

describe('nextIndex', () => {
  test('moves with the arrow keys and wraps around', () => {
    expect(nextIndex('ArrowRight', 0, 5)).toBe(1);
    expect(nextIndex('ArrowRight', 4, 5)).toBe(0);
    expect(nextIndex('ArrowLeft', 2, 5)).toBe(1);
    expect(nextIndex('ArrowLeft', 0, 5)).toBe(4);
  });

  test('jumps to the ends with Home and End', () => {
    expect(nextIndex('Home', 3, 5)).toBe(0);
    expect(nextIndex('End', 1, 5)).toBe(4);
  });

  test('ignores other keys, so Tab and typing work as usual', () => {
    for (const key of ['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'a']) {
      expect(nextIndex(key, 2, 5)).toBeNull();
    }
  });
});
