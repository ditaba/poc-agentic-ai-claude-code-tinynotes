import { describe, expect, test } from "bun:test";
import { AppError } from "@/lib/errors";
import { parseNoteContent, parseNoteContentJson } from "./validate";

const text = (value: string, marks?: object[]) => ({ type: "text", text: value, ...(marks && { marks }) });
const paragraph = (...content: object[]) => ({ type: "paragraph", content });
const doc = (...content: object[]) => ({ type: "doc", content });
const link = (href: string) => doc(paragraph(text("link", [{ type: "link", attrs: { href } }])));

// A document that uses every toolbar feature (EDIT-1).
const everyFeature = doc(
  { type: "heading", attrs: { level: 1 }, content: [text("Heading 1")] },
  { type: "heading", attrs: { level: 2 }, content: [text("Heading 2")] },
  { type: "heading", attrs: { level: 3 }, content: [text("Heading 3")] },
  paragraph(
    text("bold", [{ type: "bold" }]),
    text("italic", [{ type: "italic" }]),
    text("underline", [{ type: "underline" }]),
    text("strike", [{ type: "strike" }]),
    text("code", [{ type: "code" }]),
    text("web", [{ type: "link", attrs: { href: "https://example.com" } }]),
    text("mail", [{ type: "link", attrs: { href: "mailto:ada@example.com" } }]),
  ),
  { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("bullet"))] }] },
  { type: "orderedList", content: [{ type: "listItem", content: [paragraph(text("numbered"))] }] },
  { type: "blockquote", content: [paragraph(text("quote"))] },
  { type: "codeBlock", content: [text("const answer = 42;")] },
  { type: "horizontalRule" },
);

function expectRejected(input: unknown, message: string) {
  expect(() => parseNoteContent(input)).toThrow(AppError);
  expect(() => parseNoteContent(input)).toThrow(message);
}

describe("parseNoteContent", () => {
  test("accepts a document using every toolbar feature", () => {
    const parsed = parseNoteContent(everyFeature);
    expect(parsed.type).toBe("doc");
    expect(parsed.content).toHaveLength(everyFeature.content.length);
  });

  test("accepts an empty document", () => {
    expect(parseNoteContent(doc(paragraph()))).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  test("rejects anything that isn't a doc object", () => {
    for (const input of [null, undefined, "doc", 42, [], { type: "paragraph" }]) {
      expectRejected(input, "This note's content is invalid.");
    }
  });

  test("rejects unknown nodes and marks", () => {
    expectRejected(doc({ type: "image", attrs: { src: "https://example.com/x.png" } }), "unsupported content");
    expectRejected(doc(paragraph(text("x", [{ type: "textStyle" }]))), "unsupported content");
  });

  test("rejects invalid structure", () => {
    expectRejected(doc(text("text directly in the doc")), "unsupported content");
  });

  test("rejects content over 256 KiB", () => {
    expectRejected(doc(paragraph(text("x".repeat(256 * 1024)))), "This note is too large to save.");
  });

  test("rejects links that aren't http, https or mailto", () => {
    expectRejected(link("javascript:alert(1)"), "Links must start with");
    expectRejected(link("data:text/html,<script>alert(1)</script>"), "Links must start with");
    expectRejected(link("/relative/path"), "Links must start with");
  });

  test("rejects heading levels the editor doesn't offer", () => {
    expectRejected(doc({ type: "heading", attrs: { level: 4 }, content: [text("x")] }), "levels 1 to 3");
  });

  test("drops attributes the schema doesn't know", () => {
    const parsed = parseNoteContent(doc({ type: "paragraph", attrs: { onclick: "alert(1)" }, content: [text("x")] }));
    expect(JSON.stringify(parsed)).not.toContain("onclick");
  });
});

describe("parseNoteContentJson", () => {
  test("parses and validates a JSON string", () => {
    expect(parseNoteContentJson(JSON.stringify(everyFeature)).content).toHaveLength(everyFeature.content.length);
  });

  test("rejects invalid JSON", () => {
    expect(() => parseNoteContentJson("{not json")).toThrow("This note's content is invalid.");
  });

  test("rejects an oversized string before parsing it", () => {
    expect(() => parseNoteContentJson(`"${"x".repeat(256 * 1024)}"`)).toThrow("This note is too large to save.");
  });

  test("applies the same rules as parseNoteContent", () => {
    expect(() => parseNoteContentJson(JSON.stringify(link("javascript:alert(1)")))).toThrow("Links must start with");
  });
});
