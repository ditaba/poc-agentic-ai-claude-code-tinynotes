'use client';

import { useRouter } from 'next/navigation';
import { useActionState, type ComponentProps } from 'react';
import { inputStyles, labelStyles } from '@/components/styles';
import { SubmitButton } from '@/components/submit-button';
import { submitAuthForm, type AuthFormState, type AuthMode } from '@/lib/auth-requests';

const initialState: AuthFormState = { error: null, name: '', email: '' };

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [state, formAction] = useActionState(submit, initialState);
  const isSignUp = mode === 'sign-up';

  async function submit(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
    const state = await submitAuthForm(mode, formData);
    if (state.error === null) {
      router.replace('/dashboard');
      // Re-renders the root layout, so the header shows the signed-in user.
      router.refresh();
    }
    return state;
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
