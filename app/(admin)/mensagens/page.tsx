"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useAppStore } from "@/lib/store";

export default function MensagensPage() {
  const mensagens = useAppStore((s) => s.mensagensMarketing);
  const criar = useAppStore((s) => s.criarMensagemMarketing);
  const alternarAtiva = useAppStore((s) => s.alternarMensagemMarketingAtiva);
  const remover = useAppStore((s) => s.removerMensagemMarketing);

  const [texto, setTexto] = useState("");
  const [peso, setPeso] = useState("1");
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return mensagens
      .filter((m) => (b ? m.texto.toLowerCase().includes(b) : true))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [mensagens, busca]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Card
        title="Mensagens de Marketing"
        description="Mensagens para misturar com RSS no ticker (regra 2 notícias -> 1 mensagem)"
        actions={
          <Button
            variant="primary"
            onClick={async () => {
              const t = texto.trim();
              const p = Math.max(1, Number(peso) || 1);
              if (!t) return;
              await criar(t, p);
              setTexto("");
              setPeso("1");
            }}
          >
            + Nova Mensagem
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Input
              placeholder="Texto da mensagem..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <div className="lg:col-span-2">
            <Input
              placeholder="Peso"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="lg:col-span-3">
            <Input
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs font-semibold text-foreground/72">
              <tr>
                <th className="px-4 py-3">Mensagem</th>
                <th className="px-4 py-3">Peso</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{m.texto}</td>
                  <td className="px-4 py-3">{m.peso}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={m.ativo}
                        onChange={(v) => void alternarAtiva(m.id, v)}
                        label="Ativo"
                      />
                      <span className="text-xs text-foreground/60">
                        {m.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => void remover(m.id)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtradas.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-foreground/72">
                    Nenhuma mensagem cadastrada.
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


