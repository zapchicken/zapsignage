"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { useAppStore } from "@/lib/store";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const hidratar = useAppStore((s) => s.hidratar);
  const carregando = useAppStore((s) => s.carregando);

  useEffect(() => {
    void hidratar();
  }, [hidratar]);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-h-screen w-full flex-col">
        <div className="flex min-h-screen w-full flex-col px-5 py-6 sm:px-8">
          {carregando ? (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              Carregando…
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

