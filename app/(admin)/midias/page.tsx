"use client";

import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import type { MediaItem, MediaType } from "@/lib/types";

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
            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Tipo
            </div>
            <div className="mt-1 font-semibold">
              {item.tipo === "video" ? "Vídeo" : "Imagem"}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted p-3 text-sm">
            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Tags
            </div>
            <div className="mt-1 font-semibold">
              {item.tags.length ? item.tags.join(", ") : "—"}
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

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return midias
      .filter((m) => (tipo === "todos" ? true : m.tipo === tipo))
      .filter((m) => (b ? m.nome.toLowerCase().includes(b) : true))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [midias, busca, tipo]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Card
        title="Biblioteca de Mídias"
        description="Gerencie seus vídeos e imagens"
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
                const parsedTags = tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                await criarMidia({ file, tags: parsedTags });
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
            >
              + Adicionar Mídia
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Input
              placeholder="Buscar mídia…"
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
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {m.tipo === "video" ? "Vídeo" : "Imagem"}
                  </div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
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
                    onClick={() => void removerMidia(m.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!filtradas.length && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-muted p-8 text-center text-sm text-zinc-600 dark:text-zinc-300">
              Nenhuma mídia encontrada. Clique em “Adicionar Mídia”.
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

