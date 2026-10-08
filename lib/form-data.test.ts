import { describe, expect, test } from 'vitest';
import { readField } from './form-data';

describe('readField', () => {
  test('returns text fields as they are', () => {
    const data = new FormData();
    data.set('title', '  Plan  ');
    expect(readField(data, 'title')).toBe('  Plan  ');
  });

  test('treats missing fields and file uploads as empty', () => {
    const data = new FormData();
    data.set('upload', new File(['x'], 'x.txt'));
    expect(readField(data, 'missing')).toBe('');
    expect(readField(data, 'upload')).toBe('');
  });
});
