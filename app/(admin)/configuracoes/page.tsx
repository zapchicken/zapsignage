"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { useAppStore } from "@/lib/store";
import type { PlayerSettings } from "@/lib/types";

export default function ConfiguracoesPage() {
  const layouts = useAppStore((s) => s.layouts);
  const player = useAppStore((s) => s.player);
  const salvarPlayer = useAppStore((s) => s.salvarPlayer);

  const [draft, setDraft] = useState<PlayerSettings | null>(null);

  useEffect(() => {
    if (player && !draft) setDraft(player);
  }, [player, draft]);

  const layoutsAtivos = useMemo(
    () => layouts.filter((l) => l.ativo).slice().sort((a, b) => a.nome.localeCompare(b.nome)),
    [layouts],
  );
  const transicoes = useMemo(
    () =>
      [
        "fade",
        "slide",
        "slideRight",
        "slideUp",
        "slideDown",
        "zoomIn",
        "zoomOut",
        "flipX",
        "flipY",
        "rotateIn",
        "blurIn",
        "wipe",
      ] as const,
    [],
  );

  if (!draft) {
    return (
      <div className="flex w-full flex-1 items-center justify-center text-sm text-zinc-500">
        Carregando configurações…
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Card
        title="Configurações do Player"
        description="Ajustes de exibição e modo emergencial"
        actions={
          <Button
            variant="primary"
            onClick={() => void salvarPlayer(draft)}
          >
            Salvar Configurações
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-muted p-4">
              <div className="text-sm font-semibold">Geral</div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Resolução
                  </div>
                  <Select
                    value={draft.resolucao}
                    onChange={(e) => setDraft({ ...draft, resolucao: e.target.value })}
                  >
                    <option value="1920x1080">1920×1080 (Full HD)</option>
                    <option value="1280x720">1280×720 (HD)</option>
                    <option value="3840x2160">3840×2160 (4K)</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Efeito de transição
                  </div>
                  <Select
                    value={draft.efeitoTransicao}
                    onChange={(e) => {
                      const v = e.target.value;
                      if ((transicoes as readonly string[]).includes(v)) {
                        setDraft({ ...draft, efeitoTransicao: v as PlayerSettings["efeitoTransicao"] });
                      }
                    }}
                  >
                    <option value="fade">Fade</option>
                    <option value="slide">Slide (esquerda)</option>
                    <option value="slideRight">Slide (direita)</option>
                    <option value="slideUp">Slide (cima)</option>
                    <option value="slideDown">Slide (baixo)</option>
                    <option value="zoomIn">Zoom (entrada)</option>
                    <option value="zoomOut">Zoom (saída)</option>
                    <option value="flipX">Flip (horizontal)</option>
                    <option value="flipY">Flip (vertical)</option>
                    <option value="rotateIn">Giro</option>
                    <option value="blurIn">Desfoque</option>
                    <option value="wipe">Cortina</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Volume ({Math.round(draft.volume * 100)}%)
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={draft.volume}
                    onChange={(e) =>
                      setDraft({ ...draft, volume: Number(e.target.value) || 0 })
                    }
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Iniciar em tela cheia</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Recomendado para TV Box / PC kiosk
                      </div>
                    </div>
                    <Switch
                      checked={draft.iniciarTelaCheia}
                      onChange={(v) => setDraft({ ...draft, iniciarTelaCheia: v })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-muted p-4">
              <div className="text-sm font-semibold">Modo Emergência</div>
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Ativar modo emergência</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Força um layout específico imediatamente
                    </div>
                  </div>
                  <Switch
                    checked={draft.modoEmergenciaAtivo}
                    onChange={(v) => setDraft({ ...draft, modoEmergenciaAtivo: v })}
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Layout de emergência
                  </div>
                  <Select
                    value={draft.layoutEmergenciaId ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        layoutEmergenciaId: e.target.value || undefined,
                      })
                    }
                    disabled={!draft.modoEmergenciaAtivo}
                  >
                    <option value="">Selecione…</option>
                    {layoutsAtivos.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-xs text-zinc-600 dark:text-zinc-300">
                  Se o modo emergência estiver ativo, o Player ignora timeline global e agendamentos.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

