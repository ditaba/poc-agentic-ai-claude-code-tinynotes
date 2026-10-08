'use client';

import type { CSSProperties } from 'react';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Inline styles on purpose: importing globals.css here makes Next.js preload a
// second copy of the stylesheet on every page, unused unless this screen shows.
const styles = {
  body: {
    margin: 0,
    minHeight: '100vh',
    background: '#effcfc',
    color: '#1e293b',
    fontFamily: 'system-ui, sans-serif',
  },
  main: { maxWidth: '28rem', margin: '0 auto', padding: '4rem 1rem', textAlign: 'center' },
  heading: { margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#0e2f38' },
  text: { marginTop: '0.5rem', color: '#64748b' },
  actions: { marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' },
  primary: {
    border: 0,
    borderRadius: '0.5rem',
    padding: '0.5rem 1rem',
    background: '#1d6a78',
    color: '#fff',
    font: 'inherit',
    cursor: 'pointer',
  },
  secondary: {
    borderRadius: '0.5rem',
    padding: '0.5rem 1rem',
    border: '1px solid #b0eaee',
    background: '#fff',
    color: '#1f5763',
    textDecoration: 'none',
  },
} satisfies Record<string, CSSProperties>;

// Replaces the root layout when it fails, so it renders its own document and
// styles (ERR-4). Metadata exports don't work here; React's <title> does. Never
// shows the error's message, only the reference ID.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang='en'>
      <body style={styles.body}>
        <title>Something went wrong · NextNotes</title>
        <main style={styles.main}>
          <h1 style={styles.heading}>Something went wrong</h1>
          <p style={styles.text}>
            Please try again. If it keeps happening, come back in a few minutes.
          </p>
          {error.digest && (
            <p style={styles.text}>
              Reference ID: <code>{error.digest}</code>
            </p>
          )}
          <div style={styles.actions}>
            <button type='button' onClick={reset} style={styles.primary}>
              Try again
            </button>
            {/* A full page load: the root layout is what failed. */}
            <a href='/dashboard' style={styles.secondary}>
              Go to your notes
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
