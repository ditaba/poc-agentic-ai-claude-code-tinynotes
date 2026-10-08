export type ErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'UNAUTHENTICATED' | 'INTERNAL';

export type ActionError = { ok: false; code: ErrorCode; message: string };

// What every Server Action returns (ERR-1).
export type ActionResult<T = void> = { ok: true; data: T } | ActionError;

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

// An error whose message is safe to show to users.
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Only AppError messages reach the client; anything else becomes a generic
// INTERNAL error, so internals never leak (ERR-2).
export function toActionError(err: unknown): ActionError {
  if (err instanceof AppError) {
    return { ok: false, code: err.code, message: err.message };
  }
  return { ok: false, code: 'INTERNAL', message: GENERIC_MESSAGE };
}
