"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import type { MediaItem, MediaType } from "@/lib/types";

type MediaUsage = {
  provider: string;
  limitBytes: number;
  totalBytes: number;
  remainingBytes: number;
  totalObjects: number;
  usagePercent: number;
  limitSource: string;
  platformUploadLimitBytes: number | null;
  platformUploadLimitSource: string;
  directUploadEnabled: boolean;
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1000 && unitIndex < units.length - 1) {
    size /= 1000;
    unitIndex += 1;
  }
  return `${size >= 100 ? size.toFixed(0) : size >= 10 ? size.toFixed(1) : size.toFixed(2)} ${units[unitIndex]}`;
}

function MediaPreview({ item }: { item: MediaItem }) {
  if (item.tipo === "video") {
    return (
      <video
        src={item.publicUrl}
        className="h-full w-full object-cover"
        muted
        playsInline
      />
    );
  }
  return <img src={item.publicUrl} alt={item.nome} className="h-full w-full object-cover" />;
}

function MediaModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={item.nome}>
      <div className="flex flex-col gap-4">
        <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
          {item.tipo === "video" ? (
            <video
              src={item.publicUrl}
              className="h-full w-full object-contain"
              controls
              playsInline
            />
          ) : null}
          {item.tipo === "imagem" ? (
            <img
              src={item.publicUrl}
              alt={item.nome}
              className="h-full w-full object-contain"
            />
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted p-3 text-sm">
            <div className="text-xs font-semibold text-foreground/72">
              Tipo
            </div>
            <div className="mt-1 font-semibold">
              {item.tipo === "video" ? "Vídeo" : "Imagem"}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted p-3 text-sm">
            <div className="text-xs font-semibold text-foreground/72">
              Tags
            </div>
            <div className="mt-1 font-semibold">
              {item.tags.length ? item.tags.join(", ") : "-"}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function MidiasPage() {
  const midias = useAppStore((s) => s.midias);
  const criarMidia = useAppStore((s) => s.criarMidia);
  const alternarMidiaAtiva = useAppStore((s) => s.alternarMidiaAtiva);
  const removerMidia = useAppStore((s) => s.removerMidia);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<"todos" | MediaType>("todos");
  const [tags, setTags] = useState("promocoes, marketing");
  const [selecionada, setSelecionada] = useState<MediaItem | null>(null);
  const [erroUpload, setErroUpload] = useState("");
  const [usoMidias, setUsoMidias] = useState<MediaUsage | null>(null);
  const [carregandoUso, setCarregandoUso] = useState(true);

  const carregarUso = async () => {
    setCarregandoUso(true);
    try {
      // #region debug-point B:client-usage-start
      fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "B", location: "app/(admin)/midias/page.tsx:111", msg: "[DEBUG] client requested media usage", data: {}, ts: Date.now() }) }).catch(() => {});
      // #endregion
      const response = await fetch("/api/media/usage", { cache: "no-store" });
      const data = (await response.json()) as MediaUsage & { erro?: string };
      if (!response.ok) {
        throw new Error(data.erro ?? "Falha ao consultar o uso do armazenamento.");
      }
      // #region debug-point B:client-usage-ok
      fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "B", location: "app/(admin)/midias/page.tsx:118", msg: "[DEBUG] client received media usage", data: { totalBytes: data.totalBytes, remainingBytes: data.remainingBytes, usagePercent: data.usagePercent }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      setUsoMidias(data);
    } catch (error) {
      // #region debug-point B:client-usage-fail
      fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "B", location: "app/(admin)/midias/page.tsx:122", msg: "[DEBUG] client media usage failed", data: { error: error instanceof Error ? error.message : String(error) }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      setErroUpload(
        error instanceof Error
          ? error.message
          : "Falha ao consultar o uso do armazenamento.",
      );
    } finally {
      setCarregandoUso(false);
    }
  };

  useEffect(() => {
    void carregarUso();
  }, []);

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return midias
      .filter((m) => (tipo === "todos" ? true : m.tipo === tipo))
      .filter((m) => (b ? m.nome.toLowerCase().includes(b) : true))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [midias, busca, tipo]);

  const limiteAtingido = (usoMidias?.remainingBytes ?? 1) <= 0;
  const faixaUsoClassName =
    (usoMidias?.usagePercent ?? 0) >= 95
      ? "bg-danger"
      : (usoMidias?.usagePercent ?? 0) >= 80
        ? "bg-accent-2"
        : "bg-success";

  return (
    <div className="flex w-full flex-col gap-6">
      <Card
        title="Biblioteca de Mídias"
        description="Gerencie seus vídeos e imagens com controle de uso do Cloudflare R2"
        actions={
          <div className="inline-flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="sr-only"
              accept="video/*,image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setErroUpload("");
                // #region debug-point A:client-file-selected
                fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "A", location: "app/(admin)/midias/page.tsx:165", msg: "[DEBUG] client selected file for upload", data: { fileName: file.name, fileSize: file.size, fileType: file.type, remainingBytes: usoMidias?.remainingBytes ?? null }, ts: Date.now() }) }).catch(() => {});
                // #endregion
                if (usoMidias && file.size > usoMidias.remainingBytes) {
                  // #region debug-point A:client-limit-block
                  fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "A", location: "app/(admin)/midias/page.tsx:168", msg: "[DEBUG] client blocked file by remaining space", data: { fileSize: file.size, remainingBytes: usoMidias.remainingBytes }, ts: Date.now() }) }).catch(() => {});
                  // #endregion
                  setErroUpload(
                    `Arquivo bloqueado: ${formatBytes(file.size)} excede o espaço restante de ${formatBytes(usoMidias.remainingBytes)}.`,
                  );
                  e.target.value = "";
                  return;
                }
                const parsedTags = tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                try {
                  // #region debug-point E:client-upload-start
                  fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "E", location: "app/(admin)/midias/page.tsx:181", msg: "[DEBUG] client started media upload", data: { fileName: file.name, fileSize: file.size, tagCount: parsedTags.length }, ts: Date.now() }) }).catch(() => {});
                  // #endregion
                  await criarMidia({ file, tags: parsedTags });
                  // #region debug-point E:client-upload-ok
                  fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "E", location: "app/(admin)/midias/page.tsx:184", msg: "[DEBUG] client media upload resolved successfully", data: { fileName: file.name }, ts: Date.now() }) }).catch(() => {});
                  // #endregion
                  await carregarUso();
                } catch (error) {
                  // #region debug-point E:client-upload-fail
                  fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "E", location: "app/(admin)/midias/page.tsx:188", msg: "[DEBUG] client media upload failed", data: { error: error instanceof Error ? error.message : String(error), fileName: file.name, fileSize: file.size }, ts: Date.now() }) }).catch(() => {});
                  // #endregion
                  setErroUpload(
                    error instanceof Error ? error.message : "Falha ao enviar a mídia.",
                  );
                } finally {
                  e.target.value = "";
                }
              }}
            />
            <Button
              type="button"
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={limiteAtingido || carregandoUso}
            >
              {limiteAtingido ? "Limite atingido" : "+ Adicionar Mídia"}
            </Button>
          </div>
        }
      >
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-border bg-muted p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/60">
              Limite configurado
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {usoMidias ? formatBytes(usoMidias.limitBytes) : "Carregando..."}
            </div>
            <div className="mt-1 text-sm text-foreground/72">
              Referência do app para o plano gratuito do R2
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-muted p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/60">
              Uso atual
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {usoMidias ? formatBytes(usoMidias.totalBytes) : "Carregando..."}
            </div>
            <div className="mt-1 text-sm text-foreground/72">
              {usoMidias ? `${usoMidias.totalObjects} objeto(s) no bucket` : "Consultando bucket"}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-muted p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/60">
              Espaço restante
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {usoMidias ? formatBytes(usoMidias.remainingBytes) : "Carregando..."}
            </div>
            <div className="mt-1 text-sm text-foreground/72">
              {usoMidias ? `${usoMidias.usagePercent.toFixed(1)}% do limite em uso` : "Aguardando medição"}
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold">Uso do armazenamento</span>
            <span className="text-foreground/72">
              {usoMidias ? `${usoMidias.usagePercent.toFixed(1)}%` : carregandoUso ? "Carregando..." : "-"}
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${faixaUsoClassName}`}
              style={{ width: `${Math.min(100, usoMidias?.usagePercent ?? 0)}%` }}
            />
          </div>
          <div className="mt-3 text-sm text-foreground/72">
            O app bloqueia uploads acima do limite configurado para evitar ultrapassar a faixa gratuita do Cloudflare R2.
          </div>
        </div>

        {erroUpload ? (
          <div className="mb-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {erroUpload}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Input
              placeholder="Buscar mídia..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              value={tipo}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "todos" || v === "video" || v === "imagem") {
                  setTipo(v);
                }
              }}
            >
              <option value="todos">Todos os tipos</option>
              <option value="video">Vídeos</option>
              <option value="imagem">Imagens</option>
            </Select>
          </div>
          <div className="lg:col-span-5">
            <Input
              placeholder="Tags padrão (separadas por vírgula)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtradas.map((m) => (
            <div
              key={m.id}
              className="group overflow-hidden rounded-2xl border border-border bg-card"
            >
              <button
                type="button"
                onClick={() => setSelecionada(m)}
                className="relative block aspect-video w-full overflow-hidden bg-black"
              >
                <MediaPreview item={m} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left">
                  <div className="truncate text-sm font-semibold text-white">
                    {m.nome}
                  </div>
                </div>
              </button>
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 flex-col">
                  <div className="text-xs text-foreground/60">
                    {m.tipo === "video" ? "Vídeo" : "Imagem"}
                  </div>
                  <div className="truncate text-xs text-foreground/60">
                    {m.tags.length ? m.tags.join(", ") : "sem tags"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={m.ativo}
                    onChange={(v) => void alternarMidiaAtiva(m.id, v)}
                    label="Ativo"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      setErroUpload("");
                      try {
                        await removerMidia(m.id);
                        await carregarUso();
                      } catch (error) {
                        setErroUpload(
                          error instanceof Error ? error.message : "Falha ao excluir a mídia.",
                        );
                      }
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!filtradas.length && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-muted p-8 text-center text-sm text-foreground/72">
              Nenhuma mídia encontrada. Clique em "Adicionar Mídia".
            </div>
          )}
        </div>
      </Card>

      {selecionada && (
        <MediaModal item={selecionada} onClose={() => setSelecionada(null)} />
      )}
    </div>
  );
}


