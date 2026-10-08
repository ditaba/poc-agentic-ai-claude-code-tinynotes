import { describe, expect, test } from 'vitest';
import { generateShareToken, isWellFormedShareToken } from './share-token';

describe('generateShareToken', () => {
  test('creates 32-character base64url tokens', () => {
    const token = generateShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(isWellFormedShareToken(token)).toBe(true);
  });

  test('creates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 1000 }, generateShareToken));
    expect(tokens.size).toBe(1000);
  });
});

describe('isWellFormedShareToken', () => {
  test('rejects wrong lengths and characters', () => {
    expect(isWellFormedShareToken('')).toBe(false);
    expect(isWellFormedShareToken('a'.repeat(31))).toBe(false);
    expect(isWellFormedShareToken('a'.repeat(33))).toBe(false);
    expect(isWellFormedShareToken(`${'a'.repeat(31)}=`)).toBe(false);
    expect(isWellFormedShareToken(`${'a'.repeat(31)}/`)).toBe(false);
    expect(isWellFormedShareToken(`../${'a'.repeat(29)}`)).toBe(false);
  });
});
