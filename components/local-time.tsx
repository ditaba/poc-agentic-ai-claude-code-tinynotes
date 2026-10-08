"use client";

import { useSyncExternalStore } from "react";

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function subscribe() {
  return () => {};
}

// The server doesn't know the viewer's locale or time zone, so it renders a
// neutral UTC date. useSyncExternalStore then switches to the local format
// right after hydration, without a mismatch.
export function LocalTime({ ms }: { ms: number }) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const date = new Date(ms);

  return (
    <time dateTime={date.toISOString()}>
      {isClient ? formatter.format(date) : date.toISOString().slice(0, 10)}
    </time>
  );
}
