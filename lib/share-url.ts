import 'server-only';

// The public link for a share token (SHARE-5). BETTER_AUTH_URL is the app's
// canonical base URL, so links don't depend on the request's Host header.
export function shareUrlFor(token: string): string {
  const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  return new URL(`/s/${token}`, baseUrl).toString();
}
