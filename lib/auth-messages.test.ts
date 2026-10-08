import { describe, expect, test } from "bun:test";
import { authErrorMessage } from "./auth-messages";

describe("authErrorMessage", () => {
  test("maps invalid credentials", () => {
    expect(authErrorMessage("INVALID_EMAIL_OR_PASSWORD")).toBe("Invalid email or password");
  });

  test("maps both 'user already exists' codes", () => {
    expect(authErrorMessage("USER_ALREADY_EXISTS")).toBe("An account with this email already exists");
    expect(authErrorMessage("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")).toBe(
      "An account with this email already exists",
    );
  });

  test("maps password length codes", () => {
    expect(authErrorMessage("PASSWORD_TOO_SHORT")).toBe("Password must be 8–128 characters");
    expect(authErrorMessage("PASSWORD_TOO_LONG")).toBe("Password must be 8–128 characters");
  });

  test("maps the server's name validation code", () => {
    expect(authErrorMessage("INVALID_NAME")).toBe("Name must be 1–100 characters");
  });

  test("falls back to the generic message", () => {
    const generic = "Something went wrong. Please try again.";
    expect(authErrorMessage(undefined)).toBe(generic);
    expect(authErrorMessage("VALIDATION_ERROR")).toBe(generic);
    expect(authErrorMessage("constructor")).toBe(generic);
  });
});
