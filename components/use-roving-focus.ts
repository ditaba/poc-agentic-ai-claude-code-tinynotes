"use client";

import { useState, type FocusEvent, type KeyboardEvent } from "react";

const ITEM_SELECTOR = "[data-roving-item]";

function itemsIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
}

function nextIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

// Roving tabindex for a toolbar (WAI-ARIA APG): the toolbar is a single Tab stop,
// arrow keys move between items (wrapping), and Home/End jump to the ends.
// Items mark themselves with data-roving-item and use tabIndex={index === activeIndex ? 0 : -1}.
export function useRovingFocus() {
  const [activeIndex, setActiveIndex] = useState(0);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const items = itemsIn(event.currentTarget);
    const current = items.findIndex((item) => item === event.target);
    if (current === -1) return;

    const next = nextIndex(event.key, current, items.length);
    if (next === null) return;

    event.preventDefault();
    setActiveIndex(next);
    items[next].focus();
  }

  // Remembers the last focused item, so tabbing back in returns to it.
  function handleFocus(event: FocusEvent<HTMLElement>) {
    const index = itemsIn(event.currentTarget).findIndex((item) => item === event.target);
    if (index !== -1) setActiveIndex(index);
  }

  return { activeIndex, handleKeyDown, handleFocus };
}
