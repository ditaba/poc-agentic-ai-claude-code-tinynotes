import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonStyles } from '@/components/styles';

export const metadata: Metadata = { title: 'Page not found' };

// The same page for unknown URLs, missing or foreign notes, and invalid or
// revoked share links (ERR-5), so none of them reveals which case it was.
export default function NotFound() {
  return (
    <main className='mx-auto w-full max-w-md px-4 py-16 text-center'>
      <h1 className='text-2xl font-semibold text-aqua-950'>Page not found</h1>
      <p className='mt-2 text-slate-500'>This page doesn&apos;t exist or is no longer available.</p>
      <Link href='/' className={`mt-8 ${buttonStyles.primary}`}>
        Go to the home page
      </Link>
    </main>
  );
}
