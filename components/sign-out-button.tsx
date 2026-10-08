"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { authClient } from "@/lib/auth-client";

const SIGN_OUT_FAILED = "Couldn't sign out";

export function SignOutButton() {
  const router = useRouter();
  const [error, formAction] = useActionState(signOut, null);

  // Returns an error message, or null after signing out.
  async function signOut(): Promise<string | null> {
    try {
      const { error } = await authClient.signOut();
      if (error) return SIGN_OUT_FAILED;
    } catch {
      // Network failures. better-auth's client throws instead of returning an error.
      return SIGN_OUT_FAILED;
    }

    router.replace("/");
    // Re-renders the root layout, so the header switches back to "Sign in".
    router.refresh();
    return null;
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      {error && (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      )}
      <SubmitButton variant="secondary" pendingLabel="Signing out…">
        Sign out
      </SubmitButton>
    </form>
  );
}
