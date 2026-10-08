import { disableSharing, enableSharing } from '@/app/notes/actions';

export type SharingUpdate = { ok: true; shareUrl: string | null } | { ok: false; error: string };

export type CopyStatus = 'copied' | 'manual';

const NETWORK_ERROR = "Couldn't update sharing. Check your connection and try again.";

// Turns public sharing on or off. On success, returns the public link, or null
// once sharing is off.
export async function updateSharing(noteId: string, share: boolean): Promise<SharingUpdate> {
  try {
    if (share) {
      const result = await enableSharing(noteId);
      return result.ok
        ? { ok: true, shareUrl: result.data.shareUrl }
        : { ok: false, error: result.message };
    }
    const result = await disableSharing(noteId);
    return result.ok ? { ok: true, shareUrl: null } : { ok: false, error: result.message };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

// Copies the link to the clipboard. The clipboard can be unavailable (e.g. not
// a secure context, or permission denied), so the caller may have to fall back
// to letting the user copy it by hand.
export async function copyToClipboard(text: string): Promise<CopyStatus> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}
