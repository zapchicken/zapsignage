"use client";

import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: Props) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-border/70 bg-card px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

