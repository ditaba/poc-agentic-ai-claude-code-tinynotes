"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { db } from "@/lib/db";
import { AppError, toActionError, type ActionResult } from "@/lib/errors";
import { parseNoteInput } from "@/lib/note-input";
import * as notes from "@/lib/notes";
import { getCurrentUser } from "@/lib/session";

type LogContext = { action: string; userId?: string };

// Turns failures into ActionResults (ERR-2). Next's own control-flow errors,
// such as redirect() and notFound(), are re-thrown untouched.
async function withAction<T>(
  action: string,
  run: (context: LogContext) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const context: LogContext = { action };
  try {
    return await run(context);
  } catch (err) {
    unstable_rethrow(err);
    // AppErrors are expected and user-facing. Never log note content (ERR-3).
    if (!(err instanceof AppError)) console.error("Server action failed", context, err);
    return toActionError(err);
  }
}

// Actions report a missing session instead of redirecting, so the form keeps
// the user's content (ERR-1).
async function requireActionUser(context: LogContext) {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("UNAUTHENTICATED", "You've been signed out. Sign in again to save this note.");
  }
  context.userId = user.id;
  return user;
}

export async function createNote(input: unknown): Promise<ActionResult> {
  const result = await withAction("createNote", async (context) => {
    const user = await requireActionUser(context);
    notes.createNote(db, user.id, parseNoteInput(input));
    return { ok: true, data: undefined };
  });
  if (!result.ok) return result;

  // Outside withAction's try/catch, because redirect() works by throwing.
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
