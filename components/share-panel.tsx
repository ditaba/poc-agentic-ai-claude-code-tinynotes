'use client';

import { useId, useRef, useState, useTransition, type FocusEvent } from 'react';
import { disableSharing, enableSharing } from '@/app/notes/actions';
import { buttonStyles, inputStyles, labelStyles } from '@/components/styles';
import { Switch } from '@/components/switch';

const DISABLE_CONFIRM =
  'Anyone using this link will lose access. Turning sharing back on creates a new link.';
const NETWORK_ERROR = "Couldn't update sharing. Check your connection and try again.";
const COPIED_RESET_MS = 2000;

type CopyStatus = 'idle' | 'copied' | 'manual';

type SharePanelProps = {
  noteId: string;
  initialShareUrl: string | null;
};

// Sharing takes effect immediately and separately from saving the note, so it
// never counts as an edit (SHARE-1, SHARE-4).
export function SharePanel({ noteId, initialShareUrl }: SharePanelProps) {
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [isPending, startTransition] = useTransition();
  const linkInputRef = useRef<HTMLInputElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ids = { heading: useId(), description: useId(), switch: useId(), link: useId() };
  const isShared = shareUrl !== null;

  function handleToggle() {
    // Turning sharing off revokes the link for good (SHARE-3).
    if (isShared && !window.confirm(DISABLE_CONFIRM)) return;
    setError(null);
    setCopyStatus('idle');

    startTransition(async () => {
      try {
        if (isShared) {
          const result = await disableSharing(noteId);
          if (result.ok) setShareUrl(null);
          else setError(result.message);
        } else {
          const result = await enableSharing(noteId);
          if (result.ok) setShareUrl(result.data.shareUrl);
          else setError(result.message);
        }
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  }

  async function handleCopy() {
    if (!shareUrl) return;
    clearTimeout(copiedTimer.current);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus('copied');
      copiedTimer.current = setTimeout(() => setCopyStatus('idle'), COPIED_RESET_MS);
    } catch {
      // The clipboard can be unavailable (e.g. not a secure context). Select the
      // link so it can be copied by hand.
      linkInputRef.current?.select();
      setCopyStatus('manual');
    }
  }

  function handleLinkFocus(event: FocusEvent<HTMLInputElement>) {
    event.currentTarget.select();
  }

  return (
    <section
      aria-labelledby={ids.heading}
      className='mt-8 rounded-2xl border border-aqua-100 bg-white p-5 shadow-sm'
    >
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 id={ids.heading} className='font-medium text-aqua-950'>
            Public link
          </h2>
          <p id={ids.description} className='mt-1 text-sm text-slate-500'>
            {isShared
              ? "Anyone with the link can read this note, without an account. They can't edit it."
              : 'Only you can see this note.'}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <label htmlFor={ids.switch} className={labelStyles}>
            Share publicly
          </label>
          <Switch
            id={ids.switch}
            checked={isShared}
            onChange={handleToggle}
            disabled={isPending}
            aria-describedby={ids.description}
          />
        </div>
      </div>

      {isShared && (
        <div className='mt-4 flex flex-col gap-1.5'>
          <label htmlFor={ids.link} className={labelStyles}>
            Link
          </label>
          <div className='flex gap-2'>
            <input
              id={ids.link}
              ref={linkInputRef}
              type='url'
              readOnly
              value={shareUrl}
              onFocus={handleLinkFocus}
              className={`${inputStyles} min-w-0 font-mono text-sm`}
            />
            <button type='button' onClick={handleCopy} className={buttonStyles.secondary}>
              {copyStatus === 'copied' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <p aria-live='polite' className='mt-3 min-h-5 text-sm text-slate-500'>
        {error ? (
          <span className='text-rose-600'>{error}</span>
        ) : isPending ? (
          'Updating…'
        ) : copyStatus === 'copied' ? (
          'Link copied to the clipboard.'
        ) : copyStatus === 'manual' ? (
          "Couldn't copy automatically. The link is selected, so you can copy it yourself."
        ) : null}
      </p>
    </section>
  );
}
