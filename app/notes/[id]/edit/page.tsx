import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { NoteForm } from '@/components/note-form';
import { SharePanel } from '@/components/share-panel';
import { db } from '@/lib/db';
import { getNote } from '@/lib/notes';
import { parseNoteContent } from '@/lib/rich-text/validate';
import { requireUser } from '@/lib/session';
import { shareUrlFor } from '@/lib/share-url';

// Checks the session and ownership. Shared by generateMetadata and the page, so
// it runs once per request. Missing and foreign notes both get the 404 (NOTE-4).
const getOwnedNote = cache(async (id: string) => {
  const user = await requireUser();
  const note = getNote(db, user.id, id);
  if (!note) notFound();
  return note;
});

export async function generateMetadata({
  params,
}: PageProps<'/notes/[id]/edit'>): Promise<Metadata> {
  const note = await getOwnedNote((await params).id);
  return { title: note.title || 'Untitled' };
}

export default async function EditNotePage({ params }: PageProps<'/notes/[id]/edit'>) {
  const note = await getOwnedNote((await params).id);

  return (
    <main className='mx-auto w-full max-w-3xl px-4 py-10'>
      <h1 className='text-2xl font-semibold text-aqua-950'>Edit note</h1>
      <NoteForm
        mode='edit'
        noteId={note.id}
        initialTitle={note.title}
        // Sanitized again, like on the public page, before it reaches the editor.
        initialContent={parseNoteContent(note.content)}
      />
      <SharePanel
        noteId={note.id}
        initialShareUrl={note.shareToken ? shareUrlFor(note.shareToken) : null}
      />
    </main>
  );
}
