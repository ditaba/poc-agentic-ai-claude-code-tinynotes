import type { Editor } from '@tiptap/core';
import { describe, expect, test, vi } from 'vitest';
import { parseLinkInput, promptForLink } from './link-prompt';

describe('parseLinkInput', () => {
  test('removes the link for empty input', () => {
    expect(parseLinkInput('')).toEqual({ type: 'remove' });
    expect(parseLinkInput('   ')).toEqual({ type: 'remove' });
  });

  test('adds https:// to addresses without a protocol', () => {
    expect(parseLinkInput('example.com/budget')).toEqual({
      type: 'set',
      href: 'https://example.com/budget',
    });
  });

  test('keeps allowed protocols and trims the input', () => {
    expect(parseLinkInput('  http://example.com  ')).toEqual({
      type: 'set',
      href: 'http://example.com',
    });
    expect(parseLinkInput('mailto:ada@example.com')).toEqual({
      type: 'set',
      href: 'mailto:ada@example.com',
    });
  });

  test('refuses other protocols', () => {
    expect(parseLinkInput('javascript:alert(1)')).toEqual({ type: 'invalid' });
    expect(parseLinkInput('ftp://example.com')).toEqual({ type: 'invalid' });
  });
});

// Records the editor commands promptForLink chains together.
function fakeEditor(currentHref?: string) {
  const calls: unknown[][] = [];
  const chain: object = new Proxy(
    {},
    {
      get:
        (_target, command: string) =>
        (...args: unknown[]) => {
          calls.push([command, ...args]);
          return command === 'run' ? true : chain;
        },
    },
  );
  const editor = {
    getAttributes: () => (currentHref ? { href: currentHref } : {}),
    chain: () => chain,
  };
  return { editor: editor as unknown as Editor, calls };
}

function stubDialogs(answer: string | null) {
  const dialogs = { prompt: vi.fn(() => answer), alert: vi.fn() };
  vi.stubGlobal('window', dialogs);
  return dialogs;
}

describe('promptForLink', () => {
  test('offers https:// for a new link and sets what the user typed', () => {
    const dialogs = stubDialogs('example.com');
    const { editor, calls } = fakeEditor();

    promptForLink(editor);

    expect(dialogs.prompt).toHaveBeenCalledWith(
      'Link URL (leave empty to remove the link)',
      'https://',
    );
    expect(calls).toEqual([
      ['focus'],
      ['extendMarkRange', 'link'],
      ['setLink', { href: 'https://example.com' }],
      ['run'],
    ]);
  });

  test('offers the current address when editing a link', () => {
    const dialogs = stubDialogs(null);
    promptForLink(fakeEditor('https://example.com/old').editor);
    expect(dialogs.prompt).toHaveBeenCalledWith(expect.any(String), 'https://example.com/old');
  });

  test('changes nothing when the prompt is cancelled', () => {
    stubDialogs(null);
    const { editor, calls } = fakeEditor('https://example.com');
    promptForLink(editor);
    expect(calls).toEqual([]);
  });

  test('removes the link when the input is cleared', () => {
    stubDialogs('');
    const { editor, calls } = fakeEditor('https://example.com');
    promptForLink(editor);
    expect(calls).toContainEqual(['unsetLink']);
  });

  test('explains the rule and changes nothing for a blocked link', () => {
    const dialogs = stubDialogs('javascript:alert(1)');
    const { editor, calls } = fakeEditor();

    promptForLink(editor);

    expect(dialogs.alert).toHaveBeenCalledWith(
      'Links must start with http://, https:// or mailto:.',
    );
    expect(calls).toEqual([]);
  });
});
