import { authClient } from '@/lib/auth-client';
import { authErrorMessage } from '@/lib/auth-messages';
import { readField } from '@/lib/form-data';

// Browser-side calls to better-auth, used by the auth form and the sign-out
// button. They return user-facing messages and never throw.

export type AuthMode = 'sign-in' | 'sign-up';

export type AuthFormState = {
  // null after a successful sign-in or sign-up.
  error: string | null;
  name: string;
  email: string;
};

type Credentials = {
  name: string;
  email: string;
  password: string;
};

async function authenticate(mode: AuthMode, { name, email, password }: Credentials) {
  try {
    const { error } =
      mode === 'sign-up'
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
    return error ? authErrorMessage(error.code) : null;
  } catch {
    // Network failures and other unexpected errors.
    return authErrorMessage(undefined);
  }
}

// Signs in or up with the form's fields. Uncontrolled fields reset after a form
// action, so the name and email are returned to refill them. The password is
// never returned, so it's cleared on purpose.
export async function submitAuthForm(mode: AuthMode, formData: FormData): Promise<AuthFormState> {
  const name = readField(formData, 'name').trim();
  const email = readField(formData, 'email');
  const password = readField(formData, 'password');

  // Native constraints can't catch a name made only of spaces.
  if (mode === 'sign-up' && !name) {
    return { error: 'Enter your name', name, email };
  }

  return { error: await authenticate(mode, { name, email, password }), name, email };
}

const SIGN_OUT_FAILED = "Couldn't sign out";

// Returns an error message, or null after signing out.
export async function signOut(): Promise<string | null> {
  try {
    const { error } = await authClient.signOut();
    return error ? SIGN_OUT_FAILED : null;
  } catch {
    // Network failures. better-auth's client throws instead of returning an error.
    return SIGN_OUT_FAILED;
  }
}
