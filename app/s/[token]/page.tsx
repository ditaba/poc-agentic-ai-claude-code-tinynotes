import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { LocalTime } from '@/components/local-time';
import { NoteContent } from '@/components/note-content';
import { focusRing } from '@/components/styles';
import { db } from '@/lib/db';
import { getSharedNote } from '@/lib/notes';
import { isWellFormedShareToken } from '@/lib/share-token';

// Shared by generateMetadata and the page, so the note is read once per request.
// Malformed, unknown and revoked tokens all resolve to nothing (PUB-2).
const getShared = cache(async (token: string) =>
  isWellFormedShareToken(token) ? getSharedNote(db, token) : null,
);

export async function generateMetadata({ params }: PageProps<'/s/[token]'>): Promise<Metadata> {
  const { token } = await params;
  const note = await getShared(token);
  return {
    title: note ? note.title || 'Untitled' : 'Page not found',
    // next.config.ts also sends these as headers (PUB-4).
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

// Public: no auth check, no author and no edit controls (PUB-1, D6).
export default async function SharedNotePage({ params }: PageProps<'/s/[token]'>) {
  // Rendered on every request, so a revoked link stops working at once (PUB-3).
  await connection();
  const { token } = await params;
  const note = await getShared(token);
  if (!note) notFound();

  return (
    <main className='mx-auto w-full max-w-3xl px-4 py-10'>
      <article className='rounded-2xl border border-aqua-100 bg-white p-6 shadow-sm sm:p-8'>
        <header>
          <h1 className='text-3xl font-semibold text-aqua-950'>{note.title || 'Untitled'}</h1>
          <p className='mt-2 text-sm text-slate-500'>
            Last updated <LocalTime ms={note.updatedAt} />
          </p>
        </header>
        <NoteContent content={note.content} className='mt-6' />
      </article>

      <p className='mt-6 text-center text-sm text-slate-500'>
        Shared with NextNotes.{' '}
        <Link
          href='/auth?mode=sign-up'
          className={`rounded font-medium text-aqua-700 underline-offset-4 hover:underline ${focusRing}`}
        >
          Create your own notes
        </Link>
      </p>
    </main>
  );
}
