import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentUser } from "@/lib/session";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-aqua-100 bg-white">
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3"
      >
        <Link href="/" className={`rounded text-lg font-semibold text-aqua-950 ${focusRing}`}>
          TinyNotes
        </Link>

        {user ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-sm text-slate-500">{user.name}</span>
            <SignOutButton />
          </div>
        ) : (
          <Link
            href="/auth"
            className={`rounded-lg border border-aqua-200 px-4 py-2 text-sm font-medium text-aqua-800 transition-colors hover:bg-aqua-50 ${focusRing}`}
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
