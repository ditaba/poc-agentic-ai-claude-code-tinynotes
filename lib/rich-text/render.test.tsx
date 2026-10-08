import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderNoteContent } from './render';

const render = (content: unknown) => renderToStaticMarkup(renderNoteContent(content));
const doc = (...content: object[]) => ({ type: 'doc', content });
const text = (value: string, marks?: object[]) => ({
  type: 'text',
  text: value,
  ...(marks && { marks }),
});

describe('renderNoteContent', () => {
  test('renders the note structure', () => {
    const html = render(
      doc(
        { type: 'heading', attrs: { level: 2 }, content: [text('Plan')] },
        { type: 'paragraph', content: [text('bold', [{ type: 'bold' }])] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [text('item')] }] },
          ],
        },
      ),
    );
    expect(html).toBe('<h2>Plan</h2><p><strong>bold</strong></p><ul><li><p>item</p></li></ul>');
  });

  test('escapes text', () => {
    const html = render(doc({ type: 'paragraph', content: [text('<script>alert(1)</script>')] }));
    expect(html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  test('renders links with the safe target and rel, even if stored differently', () => {
    const html = render(
      doc({
        type: 'paragraph',
        content: [
          text('site', [
            {
              type: 'link',
              attrs: {
                href: 'https://example.com',
                class: 'fixed inset-0',
                rel: 'opener',
                target: '_self',
              },
            },
          ]),
        ],
      }),
    );
    expect(html).toBe(
      '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">site</a></p>',
    );
  });

  test('refuses content that fails validation', () => {
    const unsafe = doc({
      type: 'paragraph',
      content: [text('x', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])],
    });
    expect(() => render(unsafe)).toThrow('Links must start with');
  });
});
