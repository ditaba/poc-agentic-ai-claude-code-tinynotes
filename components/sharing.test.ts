import { describe, expect, test, vi } from 'vitest';
import { disableSharing, enableSharing } from '@/app/notes/actions';
import { copyToClipboard, updateSharing } from './sharing';

vi.mock('@/app/notes/actions', () => ({ enableSharing: vi.fn(), disableSharing: vi.fn() }));

const SHARE_URL = 'http://localhost:3000/s/abcdefghijklmnopqrstuvwxyz012345';

describe('updateSharing', () => {
  test('turning sharing on returns the public link', async () => {
    vi.mocked(enableSharing).mockResolvedValue({ ok: true, data: { shareUrl: SHARE_URL } });

    expect(await updateSharing('n1', true)).toEqual({ ok: true, shareUrl: SHARE_URL });
    expect(enableSharing).toHaveBeenCalledWith('n1');
    expect(disableSharing).not.toHaveBeenCalled();
  });

  test('turning sharing off clears the link', async () => {
    vi.mocked(disableSharing).mockResolvedValue({ ok: true, data: undefined });

    expect(await updateSharing('n1', false)).toEqual({ ok: true, shareUrl: null });
    expect(disableSharing).toHaveBeenCalledWith('n1');
    expect(enableSharing).not.toHaveBeenCalled();
  });

  test("shows the action's message when it fails", async () => {
    vi.mocked(enableSharing).mockResolvedValue({
      ok: false,
      code: 'NOT_FOUND',
      message: 'This note no longer exists.',
    });

    expect(await updateSharing('n1', true)).toEqual({
      ok: false,
      error: 'This note no longer exists.',
    });
  });

  test('reports failed requests', async () => {
    vi.mocked(disableSharing).mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await updateSharing('n1', false)).toEqual({
      ok: false,
      error: "Couldn't update sharing. Check your connection and try again.",
    });
  });
});

describe('copyToClipboard', () => {
  test('copies the text', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    expect(await copyToClipboard(SHARE_URL)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
  });

  test('falls back to copying by hand when the clipboard refuses', async () => {
    const denied = new DOMException('Write permission denied.', 'NotAllowedError');
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn(async () => Promise.reject(denied)) },
    });

    expect(await copyToClipboard(SHARE_URL)).toBe('manual');
  });

  test("falls back to copying by hand when there's no clipboard (insecure context)", async () => {
    vi.stubGlobal('navigator', {});
    expect(await copyToClipboard(SHARE_URL)).toBe('manual');
  });
});
