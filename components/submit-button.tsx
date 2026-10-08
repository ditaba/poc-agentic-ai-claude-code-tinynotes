"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonStyles, type ButtonVariant } from "@/components/styles";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  variant?: ButtonVariant;
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
    <button type="submit" disabled={pending} className={`${buttonStyles[variant]} ${className}`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
