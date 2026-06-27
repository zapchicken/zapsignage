"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { useAppStore } from "@/lib/store";
import type { Zone, ZoneDisplayMode } from "@/lib/types";

function formatPct(n: number) {
  return `${Math.round(n)}%`;
}

type Handle =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

type ActiveDrag = {
  zoneId: string;
  handle: Handle;
  startX: number;
  startY: number;
  start: Zone;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function snap(n: number, step: number) {
  if (step <= 0) return n;
  return Math.round(n / step) * step;
}

function normalizeZone(z: Zone, minSize: number) {
  const width = clamp(z.width, minSize, 100);
  const height = clamp(z.height, minSize, 100);
  const posX = clamp(z.posX, 0, 100 - width);
  const posY = clamp(z.posY, 0, 100 - height);
  return { ...z, posX, posY, width, height };
}

function ZoneCanvas({
  zones,
  selecionadaId,
  onSelecionar,
  onAtualizarParcial,
  onCommit,
  snapAtivo,
  snapStep,
}: {
  zones: Zone[];
  selecionadaId: string | null;
  onSelecionar: (id: string) => void;
  onAtualizarParcial: (zoneId: string, next: Pick<Zone, "posX" | "posY" | "width" | "height">) => void;
  onCommit: (zoneId: string) => void;
  snapAtivo: boolean;
  snapStep: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<ActiveDrag | null>(null);

  const minSize = 5;

  const getRect = () => containerRef.current?.getBoundingClientRect() ?? null;

  const onPointerDownZone = (e: ReactPointerEvent, zone: Zone, handle: Handle) => {
    e.preventDefault();
    e.stopPropagation();
    onSelecionar(zone.id);
    const rect = getRect();
    if (!rect) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    activeRef.current = {
      zoneId: zone.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      start: zone,
    };
  };

  const applySnap = (value: number) => (snapAtivo ? snap(value, snapStep) : value);

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const active = activeRef.current;
    if (!active) return;
    const rect = getRect();
    if (!rect) return;

    const dxPct = ((e.clientX - active.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - active.startY) / rect.height) * 100;

    let next = { ...active.start };

    const startLeft = active.start.posX;
    const startTop = active.start.posY;
    const startRight = active.start.posX + active.start.width;
    const startBottom = active.start.posY + active.start.height;

    if (active.handle === "move") {
      next.posX = applySnap(startLeft + dxPct);
      next.posY = applySnap(startTop + dyPct);
      next = normalizeZone(next, minSize);
      onAtualizarParcial(active.zoneId, next);
      return;
    }

    let left = startLeft;
    let top = startTop;
    let right = startRight;
    let bottom = startBottom;

    if (active.handle.includes("w")) left = applySnap(startLeft + dxPct);
    if (active.handle.includes("e")) right = applySnap(startRight + dxPct);
    if (active.handle.includes("n")) top = applySnap(startTop + dyPct);
    if (active.handle.includes("s")) bottom = applySnap(startBottom + dyPct);

    left = clamp(left, 0, 100 - minSize);
    top = clamp(top, 0, 100 - minSize);
    right = clamp(right, minSize, 100);
    bottom = clamp(bottom, minSize, 100);

    const w = right - left;
    const h = bottom - top;

    if (w < minSize) {
      if (active.handle.includes("w")) left = right - minSize;
      else right = left + minSize;
    }
    if (h < minSize) {
      if (active.handle.includes("n")) top = bottom - minSize;
      else bottom = top + minSize;
    }

    left = clamp(left, 0, 100 - minSize);
    top = clamp(top, 0, 100 - minSize);
    right = clamp(right, minSize, 100);
    bottom = clamp(bottom, minSize, 100);

    next.posX = clamp(left, 0, 100);
    next.posY = clamp(top, 0, 100);
    next.width = clamp(right - left, minSize, 100);
    next.height = clamp(bottom - top, minSize, 100);
    next = normalizeZone(next, minSize);
    onAtualizarParcial(active.zoneId, next);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const active = activeRef.current;
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    activeRef.current = null;
    onCommit(active.zoneId);
  };

  const selected = selecionadaId ? zones.find((z) => z.id === selecionadaId) ?? null : null;
  const ordered = useMemo(
    () => zones.slice().sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
    [zones],
  );

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={
        snapAtivo
          ? {
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0, rgba(255,255,255,.06) 1px, transparent 1px, transparent 10%), repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0, rgba(255,255,255,.06) 1px, transparent 1px, transparent 10%)",
              backgroundSize: "10% 10%",
            }
          : undefined
      }
    >
      <div className="absolute inset-0">
        {ordered.map((z) => {
          const ativo = z.id === selecionadaId;
          return (
            <div
              key={z.id}
              className={[
                "absolute rounded-lg border bg-accent/10",
                ativo ? "border-accent" : "border-accent/70",
              ].join(" ")}
              style={{
                left: `${z.posX}%`,
                top: `${z.posY}%`,
                width: `${z.width}%`,
                height: `${z.height}%`,
                zIndex: z.zIndex ?? 0,
              }}
              onPointerDown={(e) => onPointerDownZone(e, z, "move")}
            >
              <div className="pointer-events-none select-none p-2 text-xs font-semibold text-white">
                {z.nome} ({z.modoExibicao})
              </div>

              {ativo && (
                <div className="absolute inset-0">
                  <button
                    type="button"
                    className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded bg-accent"
                    onPointerDown={(e) => onPointerDownZone(e, z, "n")}
                  />
                  <button
                    type="button"
                    className="absolute left-1/2 bottom-0 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded bg-accent"
                    onPointerDown={(e) => onPointerDownZone(e, z, "s")}
                  />
                  <button
                    type="button"
                    className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded bg-accent"
                    onPointerDown={(e) => onPointerDownZone(e, z, "w")}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded bg-accent"
                    onPointerDown={(e) => onPointerDownZone(e, z, "e")}
                  />
                  <button
                    type="button"
                    className="absolute left-0 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded bg-accent"
                    onPointerDown={(e) => onPointerDownZone(e, z, "nw")}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded bg-accent"
                    onPointerDown={(e) => onPointerDownZone(e, z, "ne")}
                  />
                  <button
                    type="button"
                    className="absolute left-0 bottom-0 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded bg-accent"
                    onPointerDown={(e) => onPointerDownZone(e, z, "sw")}
                  />
                  <button
                    type="button"
                    className="absolute right-0 bottom-0 h-3 w-3 translate-x-1/2 translate-y-1/2 rounded bg-accent"
                    onPointerDown={(e) => onPointerDownZone(e, z, "se")}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="absolute left-3 bottom-3 rounded-lg bg-black/60 px-3 py-2 text-xs text-white">
          <div className="font-semibold">Zona selecionada</div>
          <div className="text-white/90">
            X {formatPct(selected.posX)} • Y {formatPct(selected.posY)} • W{" "}
            {formatPct(selected.width)} • H {formatPct(selected.height)}
          </div>
        </div>
      )}
    </div>
  );
}

function ZoneEditor({
  zone,
  onSave,
  onDelete,
  onClose,
}: {
  zone: Zone;
  onSave: (zone: Zone) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(zone);

  return (
    <Modal open onClose={onClose} title="Editar Zona">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            placeholder="Nome"
            value={draft.nome}
            onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Select
            value={draft.modoExibicao}
            onChange={(e) =>
              setDraft({ ...draft, modoExibicao: e.target.value as ZoneDisplayMode })
            }
          >
            <option value="video">Vídeo</option>
            <option value="imagem">Imagem</option>
            <option value="ticker">Ticker</option>
            <option value="stream">Stream</option>
          </Select>
        </div>
        <Input
          placeholder="Posição X (%)"
          value={String(draft.posX)}
          onChange={(e) => setDraft({ ...draft, posX: Number(e.target.value) || 0 })}
          inputMode="numeric"
        />
        <Input
          placeholder="Posição Y (%)"
          value={String(draft.posY)}
          onChange={(e) => setDraft({ ...draft, posY: Number(e.target.value) || 0 })}
          inputMode="numeric"
        />
        <Input
          placeholder="Largura (%)"
          value={String(draft.width)}
          onChange={(e) => setDraft({ ...draft, width: Number(e.target.value) || 0 })}
          inputMode="numeric"
        />
        <Input
          placeholder="Altura (%)"
          value={String(draft.height)}
          onChange={(e) => setDraft({ ...draft, height: Number(e.target.value) || 0 })}
          inputMode="numeric"
        />
        <Input
          placeholder="Camada (z-index)"
          value={String(draft.zIndex ?? 0)}
          onChange={(e) => setDraft({ ...draft, zIndex: Number(e.target.value) || 0 })}
          inputMode="numeric"
        />
        {draft.modoExibicao === "ticker" && (
          <>
            <div className="sm:col-span-2 mt-2 rounded-xl border border-border bg-muted p-4">
              <div className="text-sm font-semibold">Ticker</div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      Tamanho da fonte ({Math.round(draft.tickerFontePx ?? 22)}px)
                    </div>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={64}
                    step={1}
                    value={draft.tickerFontePx ?? 22}
                    onChange={(e) =>
                      setDraft({ ...draft, tickerFontePx: Number(e.target.value) || 22 })
                    }
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      Velocidade (duração por volta): {Math.round(draft.tickerDuracaoSegundos ?? 60)}s
                    </div>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={180}
                    step={1}
                    value={draft.tickerDuracaoSegundos ?? 60}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        tickerDuracaoSegundos: Number(e.target.value) || 60,
                      })
                    }
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Cor do texto
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={draft.tickerTextColor ?? "#ffffff"}
                      onChange={(e) => setDraft({ ...draft, tickerTextColor: e.target.value })}
                      className="h-10 w-14 rounded-md border border-border bg-card p-1"
                    />
                    <Input
                      value={draft.tickerTextColor ?? "#ffffff"}
                      onChange={(e) => setDraft({ ...draft, tickerTextColor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Padding horizontal ({Math.round(draft.tickerPaddingX ?? 16)}px)
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={48}
                    step={1}
                    value={draft.tickerPaddingX ?? 16}
                    onChange={(e) =>
                      setDraft({ ...draft, tickerPaddingX: Number(e.target.value) || 0 })
                    }
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Padding vertical ({Math.round(draft.tickerPaddingY ?? 8)}px)
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={32}
                    step={1}
                    value={draft.tickerPaddingY ?? 8}
                    onChange={(e) =>
                      setDraft({ ...draft, tickerPaddingY: Number(e.target.value) || 0 })
                    }
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Cor de fundo
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={draft.tickerBackground ?? "#000000"}
                      onChange={(e) => setDraft({ ...draft, tickerBackground: e.target.value })}
                      className="h-10 w-14 rounded-md border border-border bg-card p-1"
                    />
                    <Input
                      value={draft.tickerBackground ?? "#000000"}
                      onChange={(e) => setDraft({ ...draft, tickerBackground: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <Button
          variant="danger"
          onClick={async () => {
            await onDelete(draft.id);
            onClose();
          }}
        >
          Excluir Zona
        </Button>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={async () => {
            await onSave({
              ...draft,
              posX: Math.min(100, Math.max(0, draft.posX)),
              posY: Math.min(100, Math.max(0, draft.posY)),
              width: Math.min(100, Math.max(1, draft.width)),
              height: Math.min(100, Math.max(1, draft.height)),
              tickerFontePx:
                draft.modoExibicao === "ticker" ? draft.tickerFontePx ?? 22 : draft.tickerFontePx,
              tickerBackground:
                draft.modoExibicao === "ticker"
                  ? (draft.tickerBackground ?? "#000000")
                  : draft.tickerBackground,
              tickerDuracaoSegundos:
                draft.modoExibicao === "ticker"
                  ? draft.tickerDuracaoSegundos ?? 60
                  : draft.tickerDuracaoSegundos,
              tickerTextColor:
                draft.modoExibicao === "ticker"
                  ? (draft.tickerTextColor ?? "#ffffff")
                  : draft.tickerTextColor,
              tickerPaddingX:
                draft.modoExibicao === "ticker"
                  ? draft.tickerPaddingX ?? 16
                  : draft.tickerPaddingX,
              tickerPaddingY:
                draft.modoExibicao === "ticker"
                  ? draft.tickerPaddingY ?? 8
                  : draft.tickerPaddingY,
            });
            onClose();
          }}
        >
          Salvar
        </Button>
      </div>
    </Modal>
  );
}

export default function ZonasPage() {
  const params = useSearchParams();
  const layouts = useAppStore((s) => s.layouts);
  const zonas = useAppStore((s) => s.zonas);
  const criarZona = useAppStore((s) => s.criarZona);
  const salvarZona = useAppStore((s) => s.salvarZona);
  const removerZona = useAppStore((s) => s.removerZona);

  const layoutFromUrl = params.get("layout") ?? "";
  const [layoutId, setLayoutId] = useState(layoutFromUrl);
  const [nome, setNome] = useState("Zona Inferior (Ticker)");
  const [modo, setModo] = useState<ZoneDisplayMode>("ticker");
  const [posX, setPosX] = useState("0");
  const [posY, setPosY] = useState("80");
  const [width, setWidth] = useState("100");
  const [height, setHeight] = useState("20");
  const [editando, setEditando] = useState<Zone | null>(null);
  const [zonaSelecionadaId, setZonaSelecionadaId] = useState<string | null>(null);
  const [snapAtivo, setSnapAtivo] = useState(true);

  useEffect(() => {
    const v = localStorage.getItem("zapchicken.snapZonas");
    if (v === "0" || v === "1") setSnapAtivo(v === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem("zapchicken.snapZonas", snapAtivo ? "1" : "0");
  }, [snapAtivo]);

  const layoutSelecionado = layouts.find((l) => l.id === layoutId) ?? null;

  const zonasDoLayout = useMemo(() => {
    return zonas
      .filter((z) => z.layoutId === layoutId)
      .slice()
      .sort((a, b) => {
        const dz = (a.zIndex ?? 0) - (b.zIndex ?? 0);
        if (dz !== 0) return dz;
        return a.nome.localeCompare(b.nome);
      });
  }, [zonas, layoutId]);

  const [zonasPreview, setZonasPreview] = useState<Zone[]>([]);
  const commitTimeoutRef = useRef<number | null>(null);
  const zonasPreviewRef = useRef<Zone[]>([]);

  useEffect(() => {
    setZonasPreview(zonasDoLayout);
    setZonaSelecionadaId((current) => {
      if (!current) return zonasDoLayout[0]?.id ?? null;
      return zonasDoLayout.some((z) => z.id === current) ? current : zonasDoLayout[0]?.id ?? null;
    });
  }, [zonasDoLayout]);

  useEffect(() => {
    zonasPreviewRef.current = zonasPreview;
  }, [zonasPreview]);

  useEffect(() => {
    return () => {
      if (commitTimeoutRef.current) window.clearTimeout(commitTimeoutRef.current);
    };
  }, []);

  const atualizarParcial = (zoneId: string, next: Pick<Zone, "posX" | "posY" | "width" | "height">) => {
    setZonasPreview((zs) =>
      zs.map((z) =>
        z.id === zoneId ? normalizeZone({ ...z, ...next }, 5) : z,
      ),
    );
  };

  const atualizarTicker = (
    zoneId: string,
    patch: Pick<
      Zone,
      | "tickerFontePx"
      | "tickerBackground"
      | "tickerDuracaoSegundos"
      | "tickerTextColor"
      | "tickerPaddingX"
      | "tickerPaddingY"
    >,
  ) => {
    setZonasPreview((zs) => zs.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)));
    commitZona(zoneId);
  };

  const atualizarCamada = (zoneId: string, zIndex: number) => {
    setZonasPreview((zs) => zs.map((z) => (z.id === zoneId ? { ...z, zIndex } : z)));
    commitZona(zoneId);
  };

  const commitZona = (zoneId: string) => {
    if (commitTimeoutRef.current) window.clearTimeout(commitTimeoutRef.current);
    commitTimeoutRef.current = window.setTimeout(() => {
      const zone = zonasPreviewRef.current.find((z) => z.id === zoneId);
      if (!zone) return;
      void salvarZona(zone);
    }, 80);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <Card
        title="Zonas"
        description="Defina posição, tamanho e modo de exibição de cada área do layout"
        actions={
          <Button
            variant="primary"
            onClick={async () => {
              if (!layoutId) return;
              const n = nome.trim();
              if (!n) return;
              const maxZ =
                zonasDoLayout.reduce((acc, z) => Math.max(acc, z.zIndex ?? 0), 0) + 1;
              await criarZona({
                layoutId,
                nome: n,
                posX: Number(posX) || 0,
                posY: Number(posY) || 0,
                width: Number(width) || 100,
                height: Number(height) || 20,
                zIndex: maxZ,
                modoExibicao: modo,
                tickerFontePx: modo === "ticker" ? 22 : undefined,
                tickerBackground: modo === "ticker" ? "#000000" : undefined,
                tickerDuracaoSegundos: modo === "ticker" ? 60 : undefined,
                tickerTextColor: modo === "ticker" ? "#ffffff" : undefined,
                tickerPaddingX: modo === "ticker" ? 16 : undefined,
                tickerPaddingY: modo === "ticker" ? 8 : undefined,
              });
            }}
          >
            + Adicionar Zona
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  placeholder="Nome da zona"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={!layoutId}
                />
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={modo}
                  onChange={(e) => setModo(e.target.value as ZoneDisplayMode)}
                  disabled={!layoutId}
                >
                  <option value="video">Vídeo</option>
                  <option value="imagem">Imagem</option>
                  <option value="ticker">Ticker</option>
                  <option value="stream">Stream</option>
                </Select>
              </div>
              <Input
                placeholder="Posição X (%)"
                value={posX}
                onChange={(e) => setPosX(e.target.value)}
                disabled={!layoutId}
              />
              <Input
                placeholder="Posição Y (%)"
                value={posY}
                onChange={(e) => setPosY(e.target.value)}
                disabled={!layoutId}
              />
              <Input
                placeholder="Largura (%)"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                disabled={!layoutId}
              />
              <Input
                placeholder="Altura (%)"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                disabled={!layoutId}
              />
            </div>

            <div className="rounded-2xl border border-border bg-muted p-4 text-sm">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Dica rápida
              </div>
              <div className="mt-1 text-zinc-700 dark:text-zinc-200">
                Use valores em % (0–100) para montar layouts responsivos.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  {layoutSelecionado ? layoutSelecionado.nome : "Preview"}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {zonasDoLayout.length} zonas
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Snap
                </div>
                <Switch checked={snapAtivo} onChange={setSnapAtivo} label="Snap" />
              </div>
            </div>
            <ZoneCanvas
              zones={zonasPreview}
              selecionadaId={zonaSelecionadaId}
              onSelecionar={(id) => setZonaSelecionadaId(id)}
              onAtualizarParcial={atualizarParcial}
              onCommit={commitZona}
              snapAtivo={snapAtivo}
              snapStep={2}
            />
            {(() => {
              const selecionada = zonaSelecionadaId
                ? zonasPreview.find((z) => z.id === zonaSelecionadaId) ?? null
                : null;
              if (!selecionada) return null;
              const minZ = zonasPreview.reduce((acc, z) => Math.min(acc, z.zIndex ?? 0), 0);
              const maxZ = zonasPreview.reduce((acc, z) => Math.max(acc, z.zIndex ?? 0), 0);
              const atual = selecionada.zIndex ?? 0;
              return (
                <div className="rounded-2xl border border-border bg-muted p-4">
                  <div className="text-sm font-semibold">Camadas</div>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Camada (z-index)
                      </div>
                      <Input
                        value={String(atual)}
                        onChange={(e) =>
                          atualizarCamada(selecionada.id, Number(e.target.value) || 0)
                        }
                        inputMode="numeric"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => atualizarCamada(selecionada.id, atual + 1)}
                      >
                        Subir
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => atualizarCamada(selecionada.id, atual - 1)}
                      >
                        Descer
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => atualizarCamada(selecionada.id, maxZ + 1)}
                      >
                        Trazer para frente
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => atualizarCamada(selecionada.id, minZ - 1)}
                      >
                        Enviar para trás
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void removerZona(selecionada.id)}
                      >
                        Excluir Zona
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
            {(() => {
              const selecionada = zonaSelecionadaId
                ? zonasPreview.find((z) => z.id === zonaSelecionadaId) ?? null
                : null;
              if (!selecionada || selecionada.modoExibicao !== "ticker") return null;
              const fonte = selecionada.tickerFontePx ?? 22;
              const duracao = selecionada.tickerDuracaoSegundos ?? 60;
              const bg = selecionada.tickerBackground ?? "#000000";
              const corTexto = selecionada.tickerTextColor ?? "#ffffff";
              const padX = selecionada.tickerPaddingX ?? 16;
              const padY = selecionada.tickerPaddingY ?? 8;
              return (
                <div className="rounded-2xl border border-border bg-muted p-4">
                  <div className="text-sm font-semibold">Controle do Ticker</div>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Tamanho da fonte ({Math.round(fonte)}px)
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={64}
                        step={1}
                        value={fonte}
                        onChange={(e) =>
                          atualizarTicker(selecionada.id, {
                            tickerFontePx: Number(e.target.value) || 22,
                            tickerBackground: bg,
                            tickerDuracaoSegundos: duracao,
                            tickerTextColor: corTexto,
                            tickerPaddingX: padX,
                            tickerPaddingY: padY,
                          })
                        }
                        className="mt-2 w-full accent-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Velocidade (duração por volta): {Math.round(duracao)}s
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={180}
                        step={1}
                        value={duracao}
                        onChange={(e) =>
                          atualizarTicker(selecionada.id, {
                            tickerFontePx: fonte,
                            tickerBackground: bg,
                            tickerDuracaoSegundos: Number(e.target.value) || 60,
                            tickerTextColor: corTexto,
                            tickerPaddingX: padX,
                            tickerPaddingY: padY,
                          })
                        }
                        className="mt-2 w-full accent-[var(--accent)]"
                      />
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                          Cor do texto
                        </div>
                        <Input
                          value={corTexto}
                          onChange={(e) =>
                            atualizarTicker(selecionada.id, {
                              tickerFontePx: fonte,
                              tickerBackground: bg,
                              tickerDuracaoSegundos: duracao,
                              tickerTextColor: e.target.value,
                              tickerPaddingX: padX,
                              tickerPaddingY: padY,
                            })
                          }
                        />
                      </div>
                      <input
                        type="color"
                        value={corTexto}
                        onChange={(e) =>
                          atualizarTicker(selecionada.id, {
                            tickerFontePx: fonte,
                            tickerBackground: bg,
                            tickerDuracaoSegundos: duracao,
                            tickerTextColor: e.target.value,
                            tickerPaddingX: padX,
                            tickerPaddingY: padY,
                          })
                        }
                        className="h-10 w-14 rounded-md border border-border bg-card p-1"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Padding horizontal ({Math.round(padX)}px)
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={48}
                        step={1}
                        value={padX}
                        onChange={(e) =>
                          atualizarTicker(selecionada.id, {
                            tickerFontePx: fonte,
                            tickerBackground: bg,
                            tickerDuracaoSegundos: duracao,
                            tickerTextColor: corTexto,
                            tickerPaddingX: Number(e.target.value) || 0,
                            tickerPaddingY: padY,
                          })
                        }
                        className="mt-2 w-full accent-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Padding vertical ({Math.round(padY)}px)
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={32}
                        step={1}
                        value={padY}
                        onChange={(e) =>
                          atualizarTicker(selecionada.id, {
                            tickerFontePx: fonte,
                            tickerBackground: bg,
                            tickerDuracaoSegundos: duracao,
                            tickerTextColor: corTexto,
                            tickerPaddingX: padX,
                            tickerPaddingY: Number(e.target.value) || 0,
                          })
                        }
                        className="mt-2 w-full accent-[var(--accent)]"
                      />
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                          Cor de fundo
                        </div>
                        <Input
                          value={bg}
                          onChange={(e) =>
                            atualizarTicker(selecionada.id, {
                              tickerFontePx: fonte,
                              tickerBackground: e.target.value,
                              tickerDuracaoSegundos: duracao,
                              tickerTextColor: corTexto,
                              tickerPaddingX: padX,
                              tickerPaddingY: padY,
                            })
                          }
                        />
                      </div>
                      <input
                        type="color"
                        value={bg}
                        onChange={(e) =>
                          atualizarTicker(selecionada.id, {
                            tickerFontePx: fonte,
                            tickerBackground: e.target.value,
                            tickerDuracaoSegundos: duracao,
                            tickerTextColor: corTexto,
                            tickerPaddingX: padX,
                            tickerPaddingY: padY,
                          })
                        }
                        className="h-10 w-14 rounded-md border border-border bg-card p-1"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              <tr>
                <th className="px-4 py-3">Zona</th>
                <th className="px-4 py-3">Modo</th>
                <th className="px-4 py-3">Camada</th>
                <th className="px-4 py-3">Posição</th>
                <th className="px-4 py-3">Tamanho</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {zonasDoLayout.map((z) => (
                <tr key={z.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{z.nome}</td>
                  <td className="px-4 py-3">{z.modoExibicao}</td>
                  <td className="px-4 py-3">{z.zIndex ?? 0}</td>
                  <td className="px-4 py-3">
                    {formatPct(z.posX)} / {formatPct(z.posY)}
                  </td>
                  <td className="px-4 py-3">
                    {formatPct(z.width)} × {formatPct(z.height)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const maxZ = zonasDoLayout.reduce(
                            (acc, it) => Math.max(acc, it.zIndex ?? 0),
                            0,
                          );
                          void salvarZona({ ...z, zIndex: maxZ + 1 });
                        }}
                      >
                        Frente
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const minZ = zonasDoLayout.reduce(
                            (acc, it) => Math.min(acc, it.zIndex ?? 0),
                            0,
                          );
                          void salvarZona({ ...z, zIndex: minZ - 1 });
                        }}
                      >
                        Trás
                      </Button>
                      <Button size="sm" onClick={() => setEditando(z)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void removerZona(z.id)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!layoutId && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
                    Selecione um layout para listar/criar zonas.
                  </td>
                </tr>
              )}
              {layoutId && !zonasDoLayout.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
                    Nenhuma zona criada neste layout.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editando && (
        <ZoneEditor
          zone={editando}
          onSave={salvarZona}
          onDelete={removerZona}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

