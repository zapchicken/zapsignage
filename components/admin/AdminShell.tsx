"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sidebar } from "@/components/admin/Sidebar";
import { useAppStore } from "@/lib/store";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const hidratar = useAppStore((s) => s.hidratar);
  const carregando = useAppStore((s) => s.carregando);
  const erroPainel = useAppStore((s) => s.erroPainel);

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
          ) : erroPainel ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-2xl">
                <Card
                  title="Falha ao carregar o painel"
                  description="Os dados não foram apagados, mas o painel não conseguiu acessar o backend."
                  actions={
                    <>
                      <Button type="button" onClick={() => void hidratar()}>
                        Tentar novamente
                      </Button>
                      {erroPainel.includes("Sessão administrativa inválida") ? (
                        <Link href="/acesso?next=/dashboard">
                          <Button type="button" variant="primary">
                            Fazer login
                          </Button>
                        </Link>
                      ) : null}
                    </>
                  }
                >
                  <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {erroPainel}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

