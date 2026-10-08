import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@/lib/auth';

export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

// For pages only. Server Actions use getCurrentUser and return UNAUTHENTICATED
// instead, so autosave keeps the user's content.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth');
  return user;
}
