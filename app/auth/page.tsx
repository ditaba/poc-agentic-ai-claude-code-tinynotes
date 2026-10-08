import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm, type AuthMode } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/session";

// Anything other than ?mode=sign-up shows sign-in.
async function readMode(searchParams: PageProps<"/auth">["searchParams"]): Promise<AuthMode> {
  const { mode } = await searchParams;
  return mode === "sign-up" ? "sign-up" : "sign-in";
}

export async function generateMetadata({ searchParams }: PageProps<"/auth">): Promise<Metadata> {
  const mode = await readMode(searchParams);
  return { title: mode === "sign-up" ? "Sign up" : "Sign in" };
}

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  if (await getCurrentUser()) redirect("/dashboard");

  const mode = await readMode(searchParams);
  const isSignUp = mode === "sign-up";

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-2xl border border-aqua-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-aqua-950">
          {isSignUp ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-1 text-slate-500">
          {isSignUp ? "Start writing notes in seconds." : "Welcome back to NextNotes."}
        </p>

        {/* The key resets the form's state when switching modes. */}
        <AuthForm key={mode} mode={mode} />

        <p className="mt-6 text-sm text-slate-500">
          {isSignUp ? "Already have an account? " : "No account yet? "}
          <Link
            href={isSignUp ? "/auth?mode=sign-in" : "/auth?mode=sign-up"}
            className="rounded font-medium text-aqua-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>
    </main>
  );
}
