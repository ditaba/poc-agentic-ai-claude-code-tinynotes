import type { Metadata } from 'next';
import { NoteForm } from '@/components/note-form';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'New note' };

export default async function NewNotePage() {
  await requireUser();

  return (
    <main className='mx-auto w-full max-w-3xl px-4 py-10'>
      <h1 className='text-2xl font-semibold text-aqua-950'>New note</h1>
      <NoteForm mode='create' />
    </main>
  );
}
