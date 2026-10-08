const GENERIC_MESSAGE = "Something went wrong. Please try again.";
const EMAIL_TAKEN = "An account with this email already exists";
const PASSWORD_LENGTH = "Password must be 8–128 characters";

const messagesByCode = new Map<string, string>([
  ["INVALID_EMAIL_OR_PASSWORD", "Invalid email or password"],
  ["USER_ALREADY_EXISTS", EMAIL_TAKEN],
  ["USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", EMAIL_TAKEN],
  ["PASSWORD_TOO_SHORT", PASSWORD_LENGTH],
  ["PASSWORD_TOO_LONG", PASSWORD_LENGTH],
  ["INVALID_NAME", "Name must be 1–100 characters"],
]);

// Maps better-auth error codes to fixed messages. better-auth's own messages
// are never shown to users (ERR-6).
export function authErrorMessage(code: string | undefined): string {
  return messagesByCode.get(code ?? "") ?? GENERIC_MESSAGE;
}
