import { describe, expect, test } from 'vitest';
import { renderPage } from '@/test/next';
import ErrorPage from './error';
import GlobalError from './global-error';
import NotFound from './not-found';

const reset = () => {};
const serverError = (digest?: string) =>
  Object.assign(new Error('SQLITE_CONSTRAINT: note.userId secret details'), { digest });

describe.each([
  ['error page', ErrorPage],
  ['global error page', GlobalError],
])('%s', (_name, Page) => {
  test('shows a reference ID but never the error itself (ERR-4)', async () => {
    const html = await renderPage(<Page error={serverError('1234567890')} reset={reset} />);

    expect(html).toContain('Something went wrong');
    expect(html).toContain('1234567890');
    expect(html).not.toMatch(/SQLITE|secret/);
  });

  test('leaves out the reference ID for errors without one', async () => {
    const html = await renderPage(<Page error={serverError()} reset={reset} />);
    expect(html).not.toContain('Reference ID');
  });

  test('offers to try again and a way back to the notes', async () => {
    const html = await renderPage(<Page error={serverError()} reset={reset} />);
    expect(html).toMatch(/<button[^>]*>Try again<\/button>/);
    expect(html).toMatch(/<a[^>]*href="\/dashboard"[^>]*>Go to your notes<\/a>/);
  });
});

describe('global error page', () => {
  test('renders its own document, because it replaces the root layout', async () => {
    const html = await renderPage(<GlobalError error={serverError()} reset={reset} />);
    expect(html).toMatch(/^<html lang="en">/);
  });
});

describe('not found page', () => {
  test("doesn't say why the page is missing (ERR-5)", async () => {
    const html = await renderPage(<NotFound />);

    expect(html).toMatch(/<h1[^>]*>Page not found<\/h1>/);
    expect(html).toContain('This page doesn&#x27;t exist or is no longer available.');
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>Go to the home page<\/a>/);
  });
});
