import type { JSONContent } from "@tiptap/core";
import { AppError } from "@/lib/errors";
import { MAX_TITLE_LENGTH } from "@/lib/note-limits";
import { parseNoteContentJson } from "@/lib/rich-text/validate";

// What clients send. The content is the editor's JSON as a string: ProseMirror
// builds node attributes as null-prototype objects, which Server Actions can't
// receive as arguments.
export type NoteSubmission = {
  title: string;
  content: string;
};

export type NoteInput = {
  title: string;
  content: JSONContent;
};

// Validates untrusted input from a Server Action (NOTE-5). An empty title is
// allowed and shown as "Untitled" (D1).
export function parseNoteInput(input: unknown): NoteInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new AppError("VALIDATION", "This note is invalid.");
  }

  const title = "title" in input ? input.title : "";
  if (typeof title !== "string") {
    throw new AppError("VALIDATION", "The title is invalid.");
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    throw new AppError("VALIDATION", `Titles can be at most ${MAX_TITLE_LENGTH} characters.`);
  }

  const content = "content" in input ? input.content : undefined;
  if (typeof content !== "string") {
    throw new AppError("VALIDATION", "This note's content is invalid.");
  }

  return { title: trimmedTitle, content: parseNoteContentJson(content) };
}
