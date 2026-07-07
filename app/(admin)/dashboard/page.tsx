"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted p-4">
      <div className="text-xs font-semibold text-foreground/72">
        {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const layouts = useAppStore((s) => s.layouts);
  const zonas = useAppStore((s) => s.zonas);
  const midias = useAppStore((s) => s.midias);
  const fontesRss = useAppStore((s) => s.fontesRss);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>("");

  useEffect(() => {
    setUltimaAtualizacao(new Date().toLocaleTimeString("pt-BR"));
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Dashboard</div>
          <div className="text-sm text-foreground/72">
            Visão geral do seu sistema de exibição
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/player" target="_blank">
            <Button variant="primary">Ir para Player</Button>
          </Link>
          <Link href="/layouts">
            <Button>Novo Layout</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Stat label="Layouts ativos" value={layouts.filter((l) => l.ativo).length} />
        <Stat label="Zonas configuradas" value={zonas.length} />
        <Stat label="Mídias cadastradas" value={midias.length} />
        <Stat label="Fontes RSS" value={fontesRss.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Status da Exibição"
          description="Estado atual e ações rápidas"
          actions={<Button onClick={() => location.reload()}>Atualizar</Button>}
        >
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-success" />
            <div className="text-sm font-semibold">Online</div>
            <div className="text-sm text-foreground/60">
              Última atualização: {ultimaAtualizacao || "-"}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/midias">
              <Button size="sm">Adicionar mídia</Button>
            </Link>
            <Link href="/timelines">
              <Button size="sm">Editar timeline</Button>
            </Link>
            <Link href="/configuracoes">
              <Button size="sm">Configurar player</Button>
            </Link>
          </div>
        </Card>

        <Card title="Preview Atual" description="Simulação simples da TV">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
            <div className="flex h-full items-center justify-center text-sm text-foreground/72">
              Abra o Player para ver a execução real
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


