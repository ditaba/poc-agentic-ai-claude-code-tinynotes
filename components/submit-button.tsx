"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

const baseClasses =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses = {
  primary: "bg-aqua-700 text-white hover:bg-aqua-800",
  secondary: "border border-aqua-200 text-aqua-800 hover:bg-aqua-50",
} as const;

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  variant?: keyof typeof variantClasses;
  className?: string;
};

// Must be rendered inside the <form> it submits, so useFormStatus can see it.
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
