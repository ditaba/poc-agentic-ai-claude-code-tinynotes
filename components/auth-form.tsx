'use client';

import { useRouter } from 'next/navigation';
import { useActionState, type ComponentProps } from 'react';
import { inputStyles, labelStyles } from '@/components/styles';
import { SubmitButton } from '@/components/submit-button';
import { authClient } from '@/lib/auth-client';
import { authErrorMessage } from '@/lib/auth-messages';
import { readField } from '@/lib/form-data';

export type AuthMode = 'sign-in' | 'sign-up';

type FormState = {
  error: string | null;
  name: string;
  email: string;
};

type Credentials = {
  name: string;
  email: string;
  password: string;
};

const initialState: FormState = { error: null, name: '', email: '' };

// Returns a user-facing error message, or null on success.
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

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [state, formAction] = useActionState(submit, initialState);
  const isSignUp = mode === 'sign-up';

  async function submit(_previous: FormState, formData: FormData): Promise<FormState> {
    const name = readField(formData, 'name').trim();
    const email = readField(formData, 'email');
    const password = readField(formData, 'password');

    // Native constraints can't catch a name made only of spaces.
    if (isSignUp && !name) {
      return { error: 'Enter your name', name, email };
    }

    const error = await authenticate(mode, { name, email, password });
    if (error) {
      // Uncontrolled fields reset after the action, so name and email come back
      // as default values. The password is cleared on purpose.
      return { error, name, email };
    }

    router.replace('/dashboard');
    // Re-renders the root layout, so the header shows the signed-in user.
    router.refresh();
    return { error: null, name, email };
  }

  return (
    <form action={formAction} className='mt-6 flex flex-col gap-5'>
      {isSignUp && (
        <Field
          label='Name'
          name='name'
          type='text'
          autoComplete='name'
          required
          maxLength={100}
          defaultValue={state.name}
        />
      )}
      <Field
        label='Email'
        name='email'
        type='email'
        autoComplete='email'
        required
        defaultValue={state.email}
      />
      <Field
        label='Password'
        name='password'
        type='password'
        required
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        minLength={isSignUp ? 8 : undefined}
        maxLength={isSignUp ? 128 : undefined}
        hint={isSignUp ? '8–128 characters' : undefined}
      />

      <p aria-live='polite' className='min-h-5 text-sm text-rose-600'>
        {state.error}
      </p>

      <SubmitButton
        pendingLabel={isSignUp ? 'Creating account…' : 'Signing in…'}
        className='w-full'
      >
        {isSignUp ? 'Create account' : 'Sign in'}
      </SubmitButton>
    </form>
  );
}

type FieldProps = ComponentProps<'input'> & {
  label: string;
  name: string;
  hint?: string;
};

function Field({ label, name, hint, ...inputProps }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;

  return (
    <div className='flex flex-col gap-1.5'>
      <label htmlFor={name} className={labelStyles}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-describedby={hintId}
        className={inputStyles}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className='text-sm text-slate-500'>
          {hint}
        </p>
      )}
    </div>
  );
}
