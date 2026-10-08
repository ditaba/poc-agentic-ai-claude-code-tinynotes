import { getSchema, type JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { AppError } from "@/lib/errors";
import { MAX_CONTENT_BYTES } from "@/lib/note-limits";
import { HEADING_LEVELS, isAllowedHref, noteExtensions } from "@/lib/rich-text/extensions";

const schema = getSchema(noteExtensions);

function invalid(message: string): AppError {
  return new AppError("VALIDATION", message);
}

function byteLength(json: string): number {
  return new TextEncoder().encode(json).byteLength;
}

function serializedSize(input: unknown): number {
  try {
    return byteLength(JSON.stringify(input));
  } catch {
    // Circular structures and BigInts can't be stored as JSON.
    throw invalid("This note's content is invalid.");
  }
}

function parseDoc(input: unknown): ProseMirrorNode {
  try {
    const doc = schema.nodeFromJSON(input);
    // Throws on unknown nodes or marks and on invalid structure.
    doc.check();
    return doc;
  } catch {
    throw invalid("This note contains unsupported content.");
  }
}

// The schema check doesn't look at attribute values, so links and heading
// levels are checked by hand.
function assertAllowedAttributes(doc: ProseMirrorNode): void {
  doc.descendants((node) => {
    if (node.type.name === "heading" && !HEADING_LEVELS.some((level) => level === node.attrs.level)) {
      throw invalid("Headings can only be levels 1 to 3.");
    }
    for (const mark of node.marks) {
      if (mark.type.name === "link" && !isAllowedHref(String(mark.attrs.href ?? ""))) {
        throw invalid("Links must start with http://, https:// or mailto:.");
      }
    }
  });
}

// Accepts only TipTap JSON that fits the note schema (D5, SEC-3). Returns the
// normalized document, which drops attributes the schema doesn't know.
export function parseNoteContent(input: unknown): JSONContent {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("This note's content is invalid.");
  }
  if (!("type" in input) || input.type !== "doc") {
    throw invalid("This note's content is invalid.");
  }
  if (serializedSize(input) > MAX_CONTENT_BYTES) {
    throw invalid("This note is too large to save.");
  }

  const doc = parseDoc(input);
  assertAllowedAttributes(doc);
  return doc.toJSON();
}

// For content sent as a JSON string. The size is checked before parsing, so an
// oversized payload is never parsed.
export function parseNoteContentJson(json: string): JSONContent {
  if (byteLength(json) > MAX_CONTENT_BYTES) {
    throw invalid("This note is too large to save.");
  }
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    throw invalid("This note's content is invalid.");
  }
  return parseNoteContent(input);
}
