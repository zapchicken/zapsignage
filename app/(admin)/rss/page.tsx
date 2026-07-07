"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useAppStore } from "@/lib/store";
import type { RssSource } from "@/lib/types";

type RssApiResponseOk = { ok: true; titulos: string[] };
type RssApiResponseFail = { ok: false; erro?: string };

function isRssOk(value: unknown): value is RssApiResponseOk {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.ok === true && Array.isArray(v.titulos);
}

async function testarRss(url: string) {
  const res = await fetch(`/api/rss?url=${encodeURIComponent(url)}&quantidade=5`, {
    cache: "no-store",
  });
  const data = (await res.json()) as unknown;
  if (isRssOk(data)) return data.titulos;
  const fail = (data && typeof data === "object" ? (data as RssApiResponseFail) : null) ?? null;
  throw new Error(fail?.erro ?? "Falha ao testar RSS.");
}

export default function RssPage() {
  const fontes = useAppStore((s) => s.fontesRss);
  const criarFonte = useAppStore((s) => s.criarFonteRss);
  const salvarFonte = useAppStore((s) => s.salvarFonteRss);
  const removerFonte = useAppStore((s) => s.removerFonteRss);

  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [busca, setBusca] = useState("");
  const [testandoId, setTestandoId] = useState<string | null>(null);
  const [resultadoTeste, setResultadoTeste] = useState<string[] | null>(null);
  const [erroTeste, setErroTeste] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return fontes
      .filter((f) =>
        b ? f.nome.toLowerCase().includes(b) || f.url.toLowerCase().includes(b) : true,
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [fontes, busca]);

  const onSalvarAtivo = async (source: RssSource, ativo: boolean) => {
    await salvarFonte({ ...source, ativo });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <Card
        title="RSS - Fontes Cadastradas"
        description="Gerencie as fontes de notícias"
        actions={
          <Button
            variant="primary"
            onClick={async () => {
              const n = nome.trim();
              const u = url.trim();
              if (!n || !u) return;
              await criarFonte(n, u);
              setNome("");
              setUrl("");
            }}
          >
            + Nova Fonte
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="lg:col-span-6">
            <Input placeholder="URL do RSS" value={url} onChange={(e) => setUrl(e.target.value)} />
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
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{f.nome}</td>
                  <td className="px-4 py-3 text-foreground/72">
                    <a className="hover:underline" href={f.url} target="_blank" rel="noreferrer">
                      {f.url}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={f.ativo}
                        onChange={(v) => void onSalvarAtivo(f, v)}
                        label="Ativo"
                      />
                      <span className="text-xs text-foreground/60">
                        {f.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          setErroTeste(null);
                          setResultadoTeste(null);
                          setTestandoId(f.id);
                          try {
                            const titulos = await testarRss(f.url);
                            setResultadoTeste(titulos);
                          } catch (e: unknown) {
                            setErroTeste(e instanceof Error ? e.message : "Falha ao testar.");
                          } finally {
                            setTestandoId(null);
                          }
                        }}
                        disabled={testandoId === f.id}
                      >
                        {testandoId === f.id ? "Testando..." : "Testar"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void removerFonte(f.id)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtradas.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-foreground/72">
                    Nenhuma fonte cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {(resultadoTeste || erroTeste) && (
          <div className="mt-5 rounded-2xl border border-border bg-muted p-4">
            <div className="text-sm font-semibold">
              {erroTeste ? "Erro no teste" : "Exemplo de títulos"}
            </div>
            {erroTeste ? (
              <div className="mt-2 text-sm text-danger">{erroTeste}</div>
            ) : (
              <ul className="mt-2 list-disc pl-5 text-sm text-foreground/84">
                {resultadoTeste?.map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}


