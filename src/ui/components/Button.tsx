"use client";

import * as React from "react";
import { cn } from "@/src/ui/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10.5 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-primary text-white hover:bg-accent border border-primary/70 shadow-soft",
    secondary:
      "bg-secondary text-white hover:bg-primary border border-secondary/70 shadow-soft",
    outline:
      "bg-surface text-foreground border border-border hover:bg-foreground/[0.03] hover:border-foreground/25",
    ghost: "bg-transparent text-foreground/80 hover:bg-foreground/5 hover:text-foreground",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

