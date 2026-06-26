"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/lib/store";

export default function AgendamentosPage() {
  const layouts = useAppStore((s) => s.layouts);
  const agendamentos = useAppStore((s) => s.agendamentos);
  const criar = useAppStore((s) => s.criarAgendamento);
  const remover = useAppStore((s) => s.removerAgendamento);

  const [layoutId, setLayoutId] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const lista = useMemo(() => {
    return agendamentos
      .slice()
      .sort((a, b) => (a.dataInicio + a.dataFim).localeCompare(b.dataInicio + b.dataFim));
  }, [agendamentos]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Card
        title="Agendamentos"
        description="Defina períodos em que um layout deve ser exibido"
        actions={
          <Button
            variant="primary"
            onClick={async () => {
              if (!layoutId || !inicio || !fim) return;
              await criar(layoutId, inicio, fim);
              setLayoutId("");
              setInicio("");
              setFim("");
            }}
          >
            + Novo Agendamento
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Select value={layoutId} onChange={(e) => setLayoutId(e.target.value)}>
              <option value="">Selecione um layout…</option>
              {layouts
                .filter((l) => l.ativo)
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
            </Select>
          </div>
          <div className="lg:col-span-3">
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="lg:col-span-3">
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              <tr>
                <th className="px-4 py-3">Layout</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Fim</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">
                    {layouts.find((l) => l.id === a.layoutId)?.nome ?? "Layout"}
                  </td>
                  <td className="px-4 py-3">{a.dataInicio}</td>
                  <td className="px-4 py-3">{a.dataFim}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => void remover(a.id)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
                    Nenhum agendamento criado.
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

