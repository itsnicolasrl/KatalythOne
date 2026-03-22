"use client";

import * as React from "react";
import { cn } from "@/src/ui/utils/cn";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("w-full overflow-auto rounded-2xl border border-border bg-surface", className)}>
      <table className="w-full border-separate border-spacing-0">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="bg-surface-muted">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <tr className={cn("border-b border-border last:border-b-0 hover:bg-foreground/[0.02] transition-colors", className)}>
      {children}
    </tr>
  );
}

export function TableHead({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th className={cn("px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wide text-foreground/70", className)}>
      {children}
    </th>
  );
}

export function TableCell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cn("px-4 py-3 text-sm text-foreground/90", className)}>{children}</td>;
}

