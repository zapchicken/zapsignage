"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { navItems } from "@/components/admin/nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-border bg-card sm:flex sm:flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-muted">
          <img src="/logo.svg" alt="ZapChicken" className="h-8 w-8 object-contain" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-5">ZapChicken</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Digital Signage
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-5">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-zinc-600 hover:bg-muted dark:text-zinc-300",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 pb-5 text-xs text-zinc-500 dark:text-zinc-400">
        ZapChicken Signage
      </div>
    </aside>
  );
}

