'use client';

import { ErrorMessage } from '@/components/error-message';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Catches unexpected errors below the root layout, so the header stays usable.
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return <ErrorMessage digest={error.digest} onRetry={reset} />;
}
