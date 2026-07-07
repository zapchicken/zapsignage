"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAppStore } from "@/lib/store";
import { createId } from "@/lib/repo";
import type {
  LayoutTimelineItem,
  TimelineBlockType,
  ZoneTimelineBlock,
} from "@/lib/types";

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={[
        "rounded-xl border border-border bg-card",
        isDragging ? "opacity-70" : "",
      ].join(" ")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function tipoLabel(tipo: TimelineBlockType) {
  if (tipo === "media") return "Mídia";
  if (tipo === "rss") return "RSS";
  if (tipo === "texto") return "Texto";
  return "Stream";
}

export default function TimelinesPage() {
  const params = useSearchParams();
  const layouts = useAppStore((s) => s.layouts);
  const zonas = useAppStore((s) => s.zonas);
  const midias = useAppStore((s) => s.midias);
  const fontesRss = useAppStore((s) => s.fontesRss);
  const timelineGlobal = useAppStore((s) => s.timelineGlobal);
  const carregarTimelineZona = useAppStore((s) => s.carregarTimelineZona);
  const salvarTimelineZona = useAppStore((s) => s.salvarTimelineZona);
  const salvarTimelineGlobal = useAppStore((s) => s.salvarTimelineGlobal);

  const layoutFromUrl = params.get("layout") ?? "";
  const [layoutId, setLayoutId] = useState(layoutFromUrl);
  const zonasDoLayout = useMemo(
    () => zonas.filter((z) => z.layoutId === layoutId),
    [zonas, layoutId],
  );
  const [zoneId, setZoneId] = useState("");

  const [blocks, setBlocks] = useState<ZoneTimelineBlock[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroCarregar, setErroCarregar] = useState<string>("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [novoTipo, setNovoTipo] = useState<TimelineBlockType>("media");
  const [novoMediaId, setNovoMediaId] = useState("");
  const [novoRssId, setNovoRssId] = useState("");
  const [novoTexto, setNovoTexto] = useState("");
  const [novoStreamUrl, setNovoStreamUrl] = useState("");
  const [novoDuracao, setNovoDuracao] = useState("10");
  const [weatherCidade, setWeatherCidade] = useState("Jaguariuna");
  const [weatherEstado, setWeatherEstado] = useState("SP");
  const [weatherPais, setWeatherPais] = useState("BR");
  const [weatherDias, setWeatherDias] = useState("10");

  const zonaSelecionada = useMemo(
    () => (zoneId ? zonasDoLayout.find((z) => z.id === zoneId) ?? null : null),
    [zonasDoLayout, zoneId],
  );
  const weatherWidgetUrl = useMemo(() => {
    const params = new URLSearchParams({
      cidade: weatherCidade.trim() || "Jaguariuna",
      estado: weatherEstado.trim() || "SP",
      pais: weatherPais.trim() || "BR",
      dias: String(Math.max(1, Math.min(10, Number(weatherDias) || 10))),
    });
    return `/widget/tempo?${params.toString()}`;
  }, [weatherCidade, weatherDias, weatherEstado, weatherPais]);

  useEffect(() => {
    if (!zonasDoLayout.length) {
      setZoneId("");
      setBlocks([]);
      return;
    }
    if (!zoneId || !zonasDoLayout.some((z) => z.id === zoneId)) {
      setZoneId(zonasDoLayout[0]?.id ?? "");
    }
  }, [zonasDoLayout, zoneId]);

  useEffect(() => {
    setBlocks([]);
    setErroCarregar("");
  }, [layoutId]);

  useEffect(() => {
    if (!zonaSelecionada) return;
    if (zonaSelecionada.modoExibicao === "ticker") setNovoTipo("rss");
    else if (zonaSelecionada.modoExibicao === "stream") setNovoTipo("stream");
    else setNovoTipo("media");
  }, [zonaSelecionada]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!zoneId) {
        setBlocks([]);
        return;
      }
      setErroCarregar("");
      setCarregando(true);
      try {
        const b = await carregarTimelineZona(zoneId);
        if (!alive) return;
        setBlocks(b.slice().sort((a, b) => a.ordem - b.ordem));
      } catch {
        if (!alive) return;
        setErroCarregar("Falha ao carregar a timeline desta zona.");
        setBlocks([]);
      } finally {
        if (!alive) return;
        setCarregando(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [zoneId, carregarTimelineZona]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const next = arrayMove(blocks, oldIndex, newIndex).map((b, idx) => ({
      ...b,
      ordem: idx + 1,
    }));
    setBlocks(next);
  };

  const atualizarBloco = (id: string, patch: Partial<ZoneTimelineBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );
  };

  const adicionarBloco = () => {
    if (!zoneId) return;
    const duracao = Math.max(1, Number(novoDuracao) || 10);
    const ordem = blocks.length + 1;
    const base: ZoneTimelineBlock = {
      id: createId(),
      zoneId,
      tipo: novoTipo,
      duracao,
      ordem,
      config: {},
    };

    const block: ZoneTimelineBlock =
      novoTipo === "media"
        ? { ...base, mediaId: novoMediaId || undefined }
        : novoTipo === "rss"
          ? {
              ...base,
              rssSourceId: novoRssId || undefined,
              config: { quantidade: 5, proporcao: "2:1" },
            }
          : novoTipo === "texto"
            ? { ...base, texto: novoTexto || "" }
            : { ...base, streamUrl: novoStreamUrl || "" };

    setBlocks([...blocks, block]);
  };

  const salvar = async () => {
    if (!zoneId) return;
    setSalvando(true);
    const normalized = blocks
      .map((b, idx) => ({ ...b, ordem: idx + 1, zoneId }))
      .filter((b) => {
        if (b.tipo === "media") return Boolean(b.mediaId);
        if (b.tipo === "rss") return Boolean(b.rssSourceId);
        if (b.tipo === "texto") return Boolean(b.texto?.trim());
        return Boolean(b.streamUrl?.trim());
      });
    await salvarTimelineZona(zoneId, normalized);
    setBlocks(normalized);
    setSalvando(false);
  };

  const [globalItems, setGlobalItems] = useState<LayoutTimelineItem[]>(timelineGlobal);
  useEffect(() => setGlobalItems(timelineGlobal), [timelineGlobal]);

  const onDragEndGlobal = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = globalItems.findIndex((b) => b.id === active.id);
    const newIndex = globalItems.findIndex((b) => b.id === over.id);
    const next = arrayMove(globalItems, oldIndex, newIndex).map((b, idx) => ({
      ...b,
      ordem: idx + 1,
    }));
    setGlobalItems(next);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <Card
        title="Timeline por Zona"
        description="Sequência de blocos (mídia, RSS, texto, stream) com loop infinito"
        actions={
          <Button variant="primary" onClick={() => void salvar()} disabled={!zoneId || salvando}>
            {salvando ? "Salvando…" : "Salvar Timeline"}
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Select value={layoutId} onChange={(e) => setLayoutId(e.target.value)}>
              <option value="">Selecione um layout…</option>
              {layouts
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
            </Select>
          </div>
          <div className="lg:col-span-4">
            <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)} disabled={!layoutId}>
              <option value="">Selecione uma zona…</option>
              {zonasDoLayout
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nome} ({z.modoExibicao})
                  </option>
                ))}
            </Select>
          </div>
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-border bg-muted px-4 py-2 text-sm">
              Duração total:{" "}
              <span className="font-semibold">
                {blocks.reduce((acc, b) => acc + (b.duracao || 0), 0)}s
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Select
              value={novoTipo}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "media" || v === "rss" || v === "texto" || v === "stream") {
                  setNovoTipo(v);
                }
              }}
              disabled={!zoneId}
            >
              <option value="media">Mídia</option>
              <option value="rss">RSS</option>
              <option value="texto">Texto</option>
              <option value="stream">Stream</option>
            </Select>
          </div>
          <div className="lg:col-span-7">
            {novoTipo === "media" ? (
              <Select value={novoMediaId} onChange={(e) => setNovoMediaId(e.target.value)} disabled={!zoneId}>
                <option value="">Selecione uma mídia…</option>
                {midias
                  .filter((m) => m.ativo)
                  .slice()
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} ({m.tipo})
                    </option>
                  ))}
              </Select>
            ) : novoTipo === "rss" ? (
              <Select value={novoRssId} onChange={(e) => setNovoRssId(e.target.value)} disabled={!zoneId}>
                <option value="">Selecione uma fonte RSS…</option>
                {fontesRss
                  .filter((f) => f.ativo)
                  .slice()
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
              </Select>
            ) : novoTipo === "texto" ? (
              <Input
                placeholder="Texto…"
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                disabled={!zoneId}
              />
            ) : (
              <Input
                placeholder="URL do stream (m3u8/embed)…"
                value={novoStreamUrl}
                onChange={(e) => setNovoStreamUrl(e.target.value)}
                disabled={!zoneId}
              />
            )}
          </div>
          <div className="lg:col-span-2 flex gap-2">
            <Input
              placeholder="Duração (s)"
              value={novoDuracao}
              onChange={(e) => setNovoDuracao(e.target.value)}
              disabled={!zoneId}
              inputMode="numeric"
            />
            <Button onClick={adicionarBloco} disabled={!zoneId}>
              Adicionar
            </Button>
          </div>
        </div>

        {zonaSelecionada?.modoExibicao === "stream" && (
          <div className="mt-5 rounded-2xl border border-border bg-muted p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">Widget interno de tempo</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-300">
                  Gere uma URL pronta para usar a previsão por cidade em uma zona de stream.
                </div>
              </div>
              <Button type="button" onClick={() => setNovoStreamUrl(weatherWidgetUrl)}>
                Usar no campo acima
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <Input
                  placeholder="Cidade"
                  value={weatherCidade}
                  onChange={(e) => setWeatherCidade(e.target.value)}
                />
              </div>
              <div className="lg:col-span-2">
                <Input
                  placeholder="Estado"
                  value={weatherEstado}
                  onChange={(e) => setWeatherEstado(e.target.value)}
                />
              </div>
              <div className="lg:col-span-2">
                <Input
                  placeholder="País"
                  value={weatherPais}
                  onChange={(e) => setWeatherPais(e.target.value)}
                />
              </div>
              <div className="lg:col-span-2">
                <Input
                  placeholder="Dias"
                  value={weatherDias}
                  onChange={(e) => setWeatherDias(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="lg:col-span-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => window.open(weatherWidgetUrl, "_blank", "noopener,noreferrer")}
                >
                  Abrir teste
                </Button>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border bg-card px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">
              URL gerada: <span className="font-mono text-[11px]">{weatherWidgetUrl}</span>
            </div>
          </div>
        )}

        <div className="mt-5">
          {carregando ? (
            <div className="rounded-xl border border-border bg-muted p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
              Carregando timeline…
            </div>
          ) : erroCarregar ? (
            <div className="rounded-xl border border-border bg-muted p-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
              {erroCarregar}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {blocks.map((b) => (
                    <SortableRow key={b.id} id={b.id}>
                      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                            {tipoLabel(b.tipo)} • {b.duracao}s
                          </div>
                          <div className="truncate text-sm font-semibold">
                            {b.tipo === "media"
                              ? midias.find((m) => m.id === b.mediaId)?.nome ?? "Mídia não encontrada"
                              : b.tipo === "rss"
                                ? fontesRss.find((f) => f.id === b.rssSourceId)?.nome ?? "RSS não encontrado"
                                : b.tipo === "texto"
                                  ? b.texto
                                  : b.streamUrl}
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <div>
                              <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                Duração (s)
                              </div>
                              <Input
                                value={String(b.duracao)}
                                onChange={(e) =>
                                  atualizarBloco(b.id, {
                                    duracao: Math.max(1, Number(e.target.value) || 1),
                                  })
                                }
                                inputMode="numeric"
                              />
                            </div>

                            {b.tipo === "media" ? (
                              <div className="sm:col-span-2">
                                <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                  Mídia
                                </div>
                                <Select
                                  value={b.mediaId ?? ""}
                                  onChange={(e) =>
                                    atualizarBloco(b.id, { mediaId: e.target.value || undefined })
                                  }
                                >
                                  <option value="">Selecione uma mídia…</option>
                                  {midias
                                    .filter((m) => m.ativo)
                                    .slice()
                                    .sort((a, b) => a.nome.localeCompare(b.nome))
                                    .map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.nome} ({m.tipo})
                                      </option>
                                    ))}
                                </Select>
                              </div>
                            ) : b.tipo === "rss" ? (
                              <div className="sm:col-span-2">
                                <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                  Fonte RSS
                                </div>
                                <Select
                                  value={b.rssSourceId ?? ""}
                                  onChange={(e) =>
                                    atualizarBloco(b.id, { rssSourceId: e.target.value || undefined })
                                  }
                                >
                                  <option value="">Selecione uma fonte RSS…</option>
                                  {fontesRss
                                    .filter((f) => f.ativo)
                                    .slice()
                                    .sort((a, b) => a.nome.localeCompare(b.nome))
                                    .map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.nome}
                                      </option>
                                    ))}
                                </Select>
                              </div>
                            ) : b.tipo === "texto" ? (
                              <div className="sm:col-span-2">
                                <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                  Texto
                                </div>
                                <Input
                                  value={b.texto ?? ""}
                                  onChange={(e) => atualizarBloco(b.id, { texto: e.target.value })}
                                />
                              </div>
                            ) : (
                              <div className="sm:col-span-2">
                                <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                  URL do Stream
                                </div>
                                <Input
                                  value={b.streamUrl ?? ""}
                                  onChange={(e) =>
                                    atualizarBloco(b.id, { streamUrl: e.target.value })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setBlocks(blocks.filter((x) => x.id !== b.id).map((x, idx) => ({ ...x, ordem: idx + 1 })))}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    </SortableRow>
                  ))}
                  {!blocks.length && (
                    <div className="rounded-xl border border-dashed border-border bg-muted p-8 text-center text-sm text-zinc-600 dark:text-zinc-300">
                      Adicione blocos para montar a timeline desta zona.
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </Card>

      <Card
        title="Timeline Global"
        description="Controla a troca automática de layouts (loop)"
        actions={
          <Button
            variant="primary"
            onClick={() => void salvarTimelineGlobal(globalItems.map((it, idx) => ({ ...it, ordem: idx + 1 })))}
            disabled={!globalItems.length}
          >
            Salvar Timeline Global
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Select
              value=""
              onChange={(e) => {
                const layoutId = e.target.value;
                if (!layoutId) return;
                const item: LayoutTimelineItem = { id: createId(), layoutId, duracao: 60, ordem: globalItems.length + 1 };
                setGlobalItems([...globalItems, item]);
                e.target.value = "";
              }}
            >
              <option value="">Adicionar layout…</option>
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
          <div className="lg:col-span-4 rounded-xl border border-border bg-muted px-4 py-2 text-sm">
            Duração total:{" "}
            <span className="font-semibold">
              {globalItems.reduce((acc, b) => acc + (b.duracao || 0), 0)}s
            </span>
          </div>
        </div>

        <div className="mt-5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndGlobal}>
            <SortableContext items={globalItems.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {globalItems.map((it) => (
                  <SortableRow key={it.id} id={it.id}>
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {layouts.find((l) => l.id === it.layoutId)?.nome ?? "Layout"}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Duração: {it.duracao}s
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Input
                          className="w-28"
                          value={String(it.duracao)}
                          onChange={(e) => {
                            const d = Math.max(1, Number(e.target.value) || 1);
                            setGlobalItems(globalItems.map((x) => (x.id === it.id ? { ...x, duracao: d } : x)));
                          }}
                          inputMode="numeric"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setGlobalItems(globalItems.filter((x) => x.id !== it.id).map((x, idx) => ({ ...x, ordem: idx + 1 })))}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  </SortableRow>
                ))}
                {!globalItems.length && (
                  <div className="rounded-xl border border-dashed border-border bg-muted p-8 text-center text-sm text-zinc-600 dark:text-zinc-300">
                    Adicione layouts para montar a timeline global.
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </Card>
    </div>
  );
}

