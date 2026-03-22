"use client";

import * as React from "react";
import { cn } from "@/src/ui/utils/cn";

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  label?: string;
  error?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = "text", ...props }, ref) => {
    return (
      <div className="w-full">
        {label ? (
          <label className="block text-sm font-semibold mb-2 text-foreground/90">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          type={type}
          className={cn(
            "w-full rounded-xl border px-4 py-2.5 bg-surface text-foreground placeholder:text-foreground/45",
            "border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40",
            error ? "border-red-600/70 focus:ring-red-600/30 focus:border-red-600/60" : "",
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

