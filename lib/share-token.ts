// Share tokens are 24 random bytes in base64url: 32 characters, 192 bits (§9.2).
const TOKEN_BYTES = 24;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export function generateShareToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))).toString('base64url');
}

// Checked before any database lookup, so malformed tokens cost nothing.
export function isWellFormedShareToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}
