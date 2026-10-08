'use client';

import Link from 'next/link';
import { buttonStyles } from '@/components/styles';

type ErrorMessageProps = {
  // Next.js's hash of a server-side error, matching the server logs. Client-side
  // errors have none.
  digest?: string;
  onRetry: () => void;
};

// The error screen for app/error.tsx (ERR-4). Never shows the error's message,
// only the reference ID.
export function ErrorMessage({ digest, onRetry }: ErrorMessageProps) {
  return (
    <main className='mx-auto w-full max-w-md px-4 py-16 text-center'>
      <h1 className='text-2xl font-semibold text-aqua-950'>Something went wrong</h1>
      <p className='mt-2 text-slate-500'>
        Please try again. If it keeps happening, come back in a few minutes.
      </p>
      {digest && (
        <p className='mt-4 text-sm text-slate-500'>
          Reference ID: <code className='font-mono text-slate-700'>{digest}</code>
        </p>
      )}
      <div className='mt-8 flex justify-center gap-3'>
        <button type='button' onClick={onRetry} className={buttonStyles.primary}>
          Try again
        </button>
        <Link href='/dashboard' className={buttonStyles.secondary}>
          Go to your notes
        </Link>
      </div>
    </main>
  );
}
