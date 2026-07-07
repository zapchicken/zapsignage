"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useAppStore } from "@/lib/store";

export default function LayoutsPage() {
  const layouts = useAppStore((s) => s.layouts);
  const zonas = useAppStore((s) => s.zonas);
  const criar = useAppStore((s) => s.criarLayout);
  const alternar = useAppStore((s) => s.alternarLayoutAtivo);
  const remover = useAppStore((s) => s.removerLayout);

  const [nome, setNome] = useState("");
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return layouts
      .filter((l) => (b ? l.nome.toLowerCase().includes(b) : true))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [layouts, busca]);

  const zonasPorLayout = useMemo(() => {
    const map = new Map<string, number>();
    for (const z of zonas) map.set(z.layoutId, (map.get(z.layoutId) ?? 0) + 1);
    return map;
  }, [zonas]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Card
        title="Layouts"
        description="Crie e gerencie os layouts das suas telas"
        actions={
          <Button
            variant="primary"
            onClick={async () => {
              const n = nome.trim();
              if (!n) return;
              await criar(n);
              setNome("");
            }}
          >
            + Novo Layout
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Input
              placeholder="Nome do layout..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="lg:col-span-6">
            <Input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs font-semibold text-foreground/72">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Zonas</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{l.nome}</td>
                  <td className="px-4 py-3">{zonasPorLayout.get(l.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={l.ativo} onChange={(v) => void alternar(l.id, v)} />
                      <span className="text-xs text-foreground/60">
                        {l.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/zonas?layout=${encodeURIComponent(l.id)}`}>
                        <Button size="sm">Zonas</Button>
                      </Link>
                      <Link href={`/timelines?layout=${encodeURIComponent(l.id)}`}>
                        <Button size="sm">Timelines</Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => void remover(l.id)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-foreground/72">
                    Nenhum layout criado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


