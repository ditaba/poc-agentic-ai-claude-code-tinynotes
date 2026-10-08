"use client";

import { ErrorMessage } from "@/components/error-message";
import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Replaces the root layout when it fails, so it renders its own document and
// styles. Metadata exports don't work here; React's <title> does.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-aqua-50 font-[system-ui,sans-serif] text-slate-800 antialiased">
        <title>Something went wrong · NextNotes</title>
        <ErrorMessage digest={error.digest} onRetry={reset} />
      </body>
    </html>
  );
}
