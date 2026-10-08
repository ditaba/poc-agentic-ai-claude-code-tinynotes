import { vi } from 'vitest';
import { auth } from '@/lib/auth';

type TestUser = { id: string; name?: string; email?: string };

// Makes lib/session.ts see `user` as signed in, or nobody for null. Test files
// that use it must also mock next/headers, which only works inside a request:
//
//   vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
export function signInAs(user: TestUser | null): void {
  const session = user && {
    user: { name: 'Test User', email: `${user.id}@example.com`, ...user },
    session: { id: `session-${user.id}`, userId: user.id },
  };
  vi.spyOn(auth.api, 'getSession').mockResolvedValue(session as never);
}
