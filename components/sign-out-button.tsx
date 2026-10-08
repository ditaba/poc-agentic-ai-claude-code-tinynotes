'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { SubmitButton } from '@/components/submit-button';
import { signOut } from '@/lib/auth-requests';

export function SignOutButton() {
  const router = useRouter();
  const [error, formAction] = useActionState(submit, null);

  // Returns an error message, or null after signing out.
  async function submit(): Promise<string | null> {
    const error = await signOut();
    if (error === null) {
      router.replace('/');
      // Re-renders the root layout, so the header switches back to "Sign in".
      router.refresh();
    }
    return error;
  }

  return (
    <form action={formAction} className='flex items-center gap-2'>
      {error && (
        <p role='alert' className='text-xs text-rose-600'>
          {error}
        </p>
      )}
      <SubmitButton variant='secondary' pendingLabel='Signing out…'>
        Sign out
      </SubmitButton>
    </form>
  );
}
