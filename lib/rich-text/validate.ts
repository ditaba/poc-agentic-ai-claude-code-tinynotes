import { getSchema, type JSONContent } from "@tiptap/core";
import type { Attrs, Mark, Node as ProseMirrorNode } from "@tiptap/pm/model";
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

// Code block languages end up in a class name (`language-…`), so only plain
// identifiers like "ts" or "c++" are kept.
const SAFE_LANGUAGE = /^[a-z0-9+#-]{1,32}$/i;
// The values HTML allows for <ol type>.
const LIST_TYPES = new Set(["1", "a", "A", "i", "I"]);

// Only the validated href comes from the input. target, rel, class and title
// get the schema defaults (target="_blank", rel="noopener noreferrer nofollow"),
// so a crafted link can't restyle the page or drop noopener.
function safeMark(mark: Mark): Mark {
  return mark.type.name === "link" ? mark.type.create({ href: mark.attrs.href }) : mark;
}

function safeAttrs(node: ProseMirrorNode): Attrs {
  switch (node.type.name) {
    case "codeBlock": {
      const { language } = node.attrs;
      return { language: typeof language === "string" && SAFE_LANGUAGE.test(language) ? language : null };
    }
    case "orderedList": {
      const { start, type } = node.attrs;
      return {
        start: Number.isSafeInteger(start) && start >= 1 ? start : 1,
        type: typeof type === "string" && LIST_TYPES.has(type) ? type : null,
      };
    }
    default:
      return node.attrs;
  }
}

// Rebuilds the document with safe attribute values. Pasted content can carry odd
// values legitimately (e.g. a link's class), so they're replaced, not rejected.
function rebuildSafe(node: ProseMirrorNode): ProseMirrorNode {
  const marks = node.marks.map(safeMark);
  if (node.isText) return schema.text(node.text ?? "", marks);

  const children: ProseMirrorNode[] = [];
  node.forEach((child) => children.push(rebuildSafe(child)));
  return node.type.create(safeAttrs(node), children, marks);
}

// Accepts only TipTap JSON that fits the note schema (D5, SEC-3). Returns the
// normalized document: unknown attributes are dropped and the rest are made safe.
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
  return rebuildSafe(doc).toJSON();
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
