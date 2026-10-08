import Link from 'next/link';
import { SignOutButton } from '@/components/sign-out-button';
import { buttonStyles, focusRing } from '@/components/styles';
import { getCurrentUser } from '@/lib/session';

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className='border-b border-aqua-100 bg-white'>
      <nav
        aria-label='Main'
        className='mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3'
      >
        {/* Signed-out visitors get sent to /auth by the dashboard's own check. */}
        <Link
          href='/dashboard'
          className={`rounded text-lg font-semibold tracking-tight text-aqua-950 ${focusRing}`}
        >
          NextNotes
        </Link>

        {user ? (
          <div className='flex min-w-0 items-center gap-3'>
            <span className='truncate text-sm text-slate-500'>{user.name}</span>
            <SignOutButton />
          </div>
        ) : (
          <Link href='/auth' className={buttonStyles.secondary}>
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
