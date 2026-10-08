import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

// The single extension list shared by the editor, the server-side validator and
// (later) the renderer, so it must not import React.

const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];

export function isAllowedHref(href: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

export const HEADING_LEVELS = [1, 2, 3] as const;

export const noteExtensions = [
  StarterKit.configure({
    heading: { levels: [...HEADING_LEVELS] },
    link: {
      openOnClick: false,
      defaultProtocol: "https",
      isAllowedUri: (url, ctx) => ctx.defaultValidate(url) && isAllowedHref(url),
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
    },
  }),
];

export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
