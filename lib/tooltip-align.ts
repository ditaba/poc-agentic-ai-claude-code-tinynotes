export type TooltipAlign = 'start' | 'center' | 'end';

// Room a centered tooltip needs on each side; the widest is about 180px.
export const TOOLTIP_HALF_WIDTH = 96;

type Box = { left: number; right: number };

// Aligns a button's tooltip to the toolbar edge the button is close to, so it
// never sticks out of the toolbar, however the buttons wrap.
export function tooltipAlign(button: Box, toolbar: Box): TooltipAlign {
  const center = (button.left + button.right) / 2;
  if (center - toolbar.left < TOOLTIP_HALF_WIDTH) return 'start';
  if (toolbar.right - center < TOOLTIP_HALF_WIDTH) return 'end';
  return 'center';
}
