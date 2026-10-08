// Shared class strings (SPEC §11). A plain module, not "use client", so server
// and client components can both import the strings.

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2";

const buttonBase = `inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const buttonStyles = {
  primary: `${buttonBase} bg-aqua-700 text-white hover:bg-aqua-800`,
  secondary: `${buttonBase} border border-aqua-200 bg-white text-aqua-800 hover:bg-aqua-50`,
} as const;

export type ButtonVariant = keyof typeof buttonStyles;

export const inputStyles =
  "w-full rounded-lg border border-aqua-200 bg-white px-3 py-2 text-slate-800 placeholder:text-slate-400 focus-visible:border-aqua-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2";

export const labelStyles = "text-sm font-medium text-aqua-950";
