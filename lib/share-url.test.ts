import { describe, expect, test, vi } from 'vitest';
import { shareUrlFor } from './share-url';

describe('shareUrlFor', () => {
  test('builds the public link from BETTER_AUTH_URL (SHARE-5)', () => {
    vi.stubEnv('BETTER_AUTH_URL', 'https://notes.example.com');
    expect(shareUrlFor('abc123')).toBe('https://notes.example.com/s/abc123');
  });

  test('handles a base URL with a trailing slash', () => {
    vi.stubEnv('BETTER_AUTH_URL', 'https://notes.example.com/');
    expect(shareUrlFor('abc123')).toBe('https://notes.example.com/s/abc123');
  });

  test('falls back to localhost:3000', () => {
    vi.stubEnv('BETTER_AUTH_URL', undefined);
    expect(shareUrlFor('abc123')).toBe('http://localhost:3000/s/abc123');
  });
});
