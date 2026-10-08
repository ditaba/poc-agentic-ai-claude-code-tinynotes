import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';

// The read-only owner view isn't built yet; the edit page has the note and its
// share panel. The edit page checks ownership itself.
export default async function NotePage({ params }: PageProps<'/notes/[id]'>) {
  await requireUser();
  const { id } = await params;
  redirect(`/notes/${id}/edit`);
}
