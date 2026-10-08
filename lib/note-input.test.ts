import { describe, expect, test } from 'bun:test';
import { AppError } from '@/lib/errors';
import { parseNoteInput, readShareFlag } from './note-input';

const doc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
};
const content = JSON.stringify(doc);

describe('parseNoteInput', () => {
  test('trims the title', () => {
    expect(parseNoteInput({ title: '  Groceries  ', content }).title).toBe('Groceries');
  });

  test('allows an empty or missing title', () => {
    expect(parseNoteInput({ title: '   ', content }).title).toBe('');
    expect(parseNoteInput({ content }).title).toBe('');
  });

  test('accepts 200 characters and rejects 201', () => {
    expect(parseNoteInput({ title: 'x'.repeat(200), content }).title).toHaveLength(200);
    expect(() => parseNoteInput({ title: 'x'.repeat(201), content })).toThrow(
      'at most 200 characters',
    );
  });

  test('measures the limit after trimming', () => {
    expect(parseNoteInput({ title: ` ${'x'.repeat(200)} `, content }).title).toHaveLength(200);
  });

  test('rejects non-string titles and non-object input', () => {
    expect(() => parseNoteInput({ title: 42, content })).toThrow(AppError);
    expect(() => parseNoteInput(null)).toThrow(AppError);
    expect(() => parseNoteInput('note')).toThrow(AppError);
  });

  test('parses and validates the content JSON string', () => {
    expect(parseNoteInput({ title: 'x', content }).content).toEqual(doc);
    expect(() => parseNoteInput({ title: 'x' })).toThrow("This note's content is invalid.");
    expect(() => parseNoteInput({ title: 'x', content: doc })).toThrow(
      "This note's content is invalid.",
    );
    expect(() => parseNoteInput({ title: 'x', content: '{not json' })).toThrow(
      "This note's content is invalid.",
    );
  });

  test('accepts nodes with attributes, as the editor sends them', () => {
    // ProseMirror attrs are null-prototype objects; they survive JSON.stringify.
    const attrs = Object.assign(Object.create(null), { level: 2 });
    const heading = {
      type: 'doc',
      content: [{ type: 'heading', attrs, content: [{ type: 'text', text: 'Plan' }] }],
    };

    const parsed = parseNoteInput({ title: 'x', content: JSON.stringify(heading) });

    expect(parsed.content.content?.[0]).toEqual({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Plan' }],
    });
  });
});

describe('readShareFlag', () => {
  test('is true only for an explicit true', () => {
    expect(readShareFlag({ isShared: true })).toBe(true);
    expect(readShareFlag({ isShared: 'true' })).toBe(false);
    expect(readShareFlag({ isShared: 1 })).toBe(false);
    expect(readShareFlag({})).toBe(false);
    expect(readShareFlag(null)).toBe(false);
  });
});
