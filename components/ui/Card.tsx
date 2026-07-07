import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/70 bg-card shadow-[0_8px_30px_rgba(17,24,39,0.06)]",
        className,
      )}
    >
      {(title || description || actions) && (
        <div className="flex flex-col gap-1 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && <div className="text-base font-semibold">{title}</div>}
            {description && <div className="mt-0.5 text-sm text-foreground/72">{description}</div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

