import { describe, expect, test } from 'bun:test';
import { AppError, toActionError } from './errors';

describe('toActionError', () => {
  test("passes an AppError's code and message through", () => {
    expect(toActionError(new AppError('VALIDATION', 'Title too long'))).toEqual({
      ok: false,
      code: 'VALIDATION',
      message: 'Title too long',
    });
  });

  test('turns any other error into a generic INTERNAL error without leaking it', () => {
    const result = toActionError(new Error('SQLITE_CONSTRAINT: secret details'));
    expect(result).toEqual({
      ok: false,
      code: 'INTERNAL',
      message: 'Something went wrong. Please try again.',
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  test('handles non-Error values', () => {
    expect(toActionError('boom').code).toBe('INTERNAL');
  });
});
