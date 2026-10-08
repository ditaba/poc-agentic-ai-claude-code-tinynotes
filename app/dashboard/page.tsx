import type { Metadata } from 'next';
import Link from 'next/link';
import { LocalTime } from '@/components/local-time';
import { buttonStyles } from '@/components/styles';
import { db } from '@/lib/db';
import { listNotes, type NoteSummary } from '@/lib/notes';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireUser();
  const notes = listNotes(db, user.id);

  return (
    <main className='mx-auto w-full max-w-3xl px-4 py-10'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-2xl font-semibold text-aqua-950'>Your notes</h1>
        <Link href='/notes/new' className={buttonStyles.primary}>
          New note
        </Link>
      </div>

      {notes.length > 0 ? <NoteList notes={notes} /> : <EmptyState />}
    </main>
  );
}

function NoteList({ notes }: { notes: NoteSummary[] }) {
  return (
    <ul className='mt-6 flex flex-col gap-3'>
      {notes.map((note) => (
        // The link stretches over the whole card, and the card shows its focus ring.
        <li
          key={note.id}
          className='relative rounded-2xl border border-aqua-100 bg-white p-4 shadow-sm transition-colors hover:border-aqua-300 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-aqua-400 has-[a:focus-visible]:ring-offset-2'
        >
          <div className='flex items-start justify-between gap-3'>
            <h2 className='min-w-0 truncate font-medium text-aqua-950'>
              <Link
                href={`/notes/${note.id}/edit`}
                className='after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none'
              >
                {note.title || 'Untitled'}
              </Link>
            </h2>
            {note.isShared && (
              <span className='shrink-0 rounded-full bg-aqua-100 px-2 py-0.5 text-xs font-medium text-aqua-800'>
                Shared
              </span>
            )}
          </div>
          <p className='mt-1 text-sm text-slate-500'>
            Updated <LocalTime ms={note.updatedAt} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className='mt-6 rounded-2xl border border-dashed border-aqua-200 bg-white px-6 py-12 text-center'>
      <h2 className='font-medium text-aqua-950'>No notes yet</h2>
      <p className='mt-1 text-sm text-slate-500'>Notes you create will show up here.</p>
      <Link href='/notes/new' className={`mt-5 ${buttonStyles.primary}`}>
        Create your first note
      </Link>
    </div>
  );
}
