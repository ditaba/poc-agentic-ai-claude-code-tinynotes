import { describe, expect, test } from 'vitest';
import { TOOLTIP_HALF_WIDTH, tooltipAlign } from './tooltip-align';

const toolbar = { left: 100, right: 700 };
// A 32px button centered on `center`.
const buttonAt = (center: number) => ({ left: center - 16, right: center + 16 });

describe('tooltipAlign', () => {
  test('centers tooltips with room on both sides', () => {
    expect(tooltipAlign(buttonAt(400), toolbar)).toBe('center');
  });

  test('aligns to the start near the left edge', () => {
    expect(tooltipAlign(buttonAt(120), toolbar)).toBe('start');
    expect(tooltipAlign(buttonAt(100 + TOOLTIP_HALF_WIDTH - 1), toolbar)).toBe('start');
    expect(tooltipAlign(buttonAt(100 + TOOLTIP_HALF_WIDTH), toolbar)).toBe('center');
  });

  test('aligns to the end near the right edge', () => {
    expect(tooltipAlign(buttonAt(680), toolbar)).toBe('end');
    expect(tooltipAlign(buttonAt(700 - TOOLTIP_HALF_WIDTH + 1), toolbar)).toBe('end');
  });

  test('prefers the start in a toolbar too narrow for a centered tooltip', () => {
    expect(tooltipAlign(buttonAt(160), { left: 100, right: 220 })).toBe('start');
  });
});
