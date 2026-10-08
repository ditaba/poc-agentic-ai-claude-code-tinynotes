"use client";

import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/");
    // Re-renders the root layout, so the header switches back to "Sign in".
    router.refresh();
  }

  return (
    <form action={handleSignOut}>
      <SubmitButton variant="secondary" pendingLabel="Signing out…">
        Sign out
      </SubmitButton>
    </form>
  );
}
