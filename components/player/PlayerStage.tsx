"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { ZoneTimelineBlock } from "@/lib/types";
import { escolherLayoutAtivo } from "@/lib/playerRuntime";
import { montarTickerTexto } from "@/lib/ticker";

function useLoopingBlock(blocks: ZoneTimelineBlock[]) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [blocks.map((b) => b.id).join(",")]);

  useEffect(() => {
    if (!blocks.length) return;
    const current = blocks[index] ?? blocks[0];
    const ms = Math.max(1, current.duracao || 1) * 1000;
    const t = window.setTimeout(() => {
      setIndex((i) => (i + 1) % blocks.length);
    }, ms);
    return () => window.clearTimeout(t);
  }, [blocks, index]);

  return blocks[index] ?? null;
}

async function buscarTitulosRss(url: string) {
  const res = await fetch(`/api/rss?url=${encodeURIComponent(url)}&quantidade=10`, {
    cache: "no-store",
  });
  const data = (await res.json()) as unknown;
  if (!data || typeof data !== "object") return { titulos: [] as string[], erro: "Resposta inválida." };
  const v = data as Record<string, unknown>;
  if (v.ok !== true) {
    const erro = typeof v.erro === "string" ? v.erro : "Falha ao buscar RSS.";
    return { titulos: [] as string[], erro };
  }
  if (!Array.isArray(v.titulos)) return { titulos: [] as string[], erro: "RSS sem títulos." };
  const titulos = v.titulos.filter((t): t is string => typeof t === "string" && Boolean(t.trim()));
  return { titulos };
}

function ZoneMedia({
  blocks,
}: {
  blocks: ZoneTimelineBlock[];
}) {
  const midias = useAppStore((s) => s.midias);
  const settings = useAppStore((s) => s.player);
  const block = useLoopingBlock(blocks);
  const media = useMemo(() => {
    if (!block?.mediaId) return null;
    return midias.find((m) => m.id === block.mediaId) ?? null;
  }, [block, midias]);
  const url = media?.publicUrl ?? null;

  if (!block || !media || !url) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-zinc-300">
        Sem conteúdo
      </div>
    );
  }

  const efeito = settings?.efeitoTransicao ?? "fade";
  const anim = (() => {
    switch (efeito) {
      case "fade":
        return "animate-[fadeIn_.35s_ease-out]";
      case "slide":
        return "animate-[slideInLeft_.45s_cubic-bezier(.2,.8,.2,1)]";
      case "slideRight":
        return "animate-[slideInRight_.45s_cubic-bezier(.2,.8,.2,1)]";
      case "slideUp":
        return "animate-[slideInUp_.45s_cubic-bezier(.2,.8,.2,1)]";
      case "slideDown":
        return "animate-[slideInDown_.45s_cubic-bezier(.2,.8,.2,1)]";
      case "zoomIn":
        return "animate-[zoomIn_.45s_cubic-bezier(.2,.8,.2,1)]";
      case "zoomOut":
        return "animate-[zoomOut_.45s_cubic-bezier(.2,.8,.2,1)]";
      case "flipX":
        return "animate-[flipInX_.6s_cubic-bezier(.2,.8,.2,1)]";
      case "flipY":
        return "animate-[flipInY_.6s_cubic-bezier(.2,.8,.2,1)]";
      case "rotateIn":
        return "animate-[rotateIn_.55s_cubic-bezier(.2,.8,.2,1)]";
      case "blurIn":
        return "animate-[blurIn_.55s_ease-out]";
      case "wipe":
        return "animate-[wipeIn_.55s_cubic-bezier(.2,.8,.2,1)]";
      default:
        return "animate-[fadeIn_.35s_ease-out]";
    }
  })();

  if (media.tipo === "video") {
    return (
      <video
        key={block.id}
        src={url}
        className={[
          "h-full w-full object-cover",
          anim,
        ].join(" ")}
        muted
        autoPlay
        playsInline
      />
    );
  }

  return (
    <img
      key={block.id}
      src={url}
      alt={media.nome}
      className={[
        "h-full w-full object-cover",
        anim,
      ].join(" ")}
    />
  );
}

function ZoneStream({ blocks }: { blocks: ZoneTimelineBlock[] }) {
  const block = useLoopingBlock(blocks);
  const url = block?.streamUrl?.trim();
  if (!block || !url) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-zinc-300">
        Sem stream
      </div>
    );
  }

  if (url.endsWith(".m3u8")) {
    return (
      <video
        key={block.id}
        src={url}
        className="h-full w-full object-cover"
        autoPlay
        muted
        playsInline
      />
    );
  }

  return (
    <iframe
      key={block.id}
      src={url}
      className="h-full w-full"
      allow="autoplay; fullscreen"
    />
  );
}

function ZoneTicker({
  zone,
  blocks,
}: {
  zone: {
    tickerFontePx?: number;
    tickerBackground?: string;
    tickerDuracaoSegundos?: number;
    tickerTextColor?: string;
    tickerPaddingX?: number;
    tickerPaddingY?: number;
  };
  blocks: ZoneTimelineBlock[];
}) {
  const fontes = useAppStore((s) => s.fontesRss);
  const mensagens = useAppStore((s) => s.mensagensMarketing);
  const [texto, setTexto] = useState("");
  const [status, setStatus] = useState<string>("");
  const duracao = Math.max(10, Math.min(180, zone.tickerDuracaoSegundos ?? 60));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [duracaoEfetiva, setDuracaoEfetiva] = useState(duracao);
  const [distanciaPx, setDistanciaPx] = useState<number>(0);
  const fontSize = Math.max(12, Math.min(64, zone.tickerFontePx ?? 22));
  const background = zone.tickerBackground?.trim() ? zone.tickerBackground.trim() : "#000000";
  const textColor = zone.tickerTextColor?.trim() ? zone.tickerTextColor.trim() : "#ffffff";
  const padX = Math.max(0, Math.min(48, zone.tickerPaddingX ?? 16));
  const padY = Math.max(0, Math.min(32, zone.tickerPaddingY ?? 8));

  const rssIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of blocks) if (b.tipo === "rss" && b.rssSourceId) ids.add(b.rssSourceId);
    return Array.from(ids);
  }, [blocks]);

  const textosFixos = useMemo(() => {
    const out: string[] = [];
    for (const b of blocks) if (b.tipo === "texto" && b.texto?.trim()) out.push(b.texto.trim());
    return out;
  }, [blocks]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (alive) setStatus("Carregando RSS…");
      const urls = rssIds
        .map((id) => fontes.find((f) => f.id === id))
        .filter(Boolean)
        .filter((f) => f!.ativo)
        .map((f) => f!.url);

      const noticias: string[] = [];
      const erros: string[] = [];
      for (const u of urls) {
        const res = await buscarTitulosRss(u);
        noticias.push(...res.titulos);
        if (res.erro) erros.push(res.erro);
      }

      const textoRss = montarTickerTexto({
        noticias,
        mensagens,
        proporcaoNoticiasParaMensagem: 2,
      });

      const textoLocal = textosFixos.length ? `${textosFixos.join(" • ")} • ` : "";
      const fallbackMarketing = montarTickerTexto({ noticias: [], mensagens });
      const final = textoLocal || textoRss || fallbackMarketing || "Configure RSS e/ou Mensagens • ";

      let nextStatus = "";
      if (textoLocal) nextStatus = "Texto";
      else if (textoRss) nextStatus = `RSS (${noticias.length})`;
      else if (fallbackMarketing) nextStatus = "Marketing";
      else nextStatus = "Sem conteúdo";
      if (!textoRss && urls.length && erros.length) nextStatus = `Falha RSS (${erros[0]})`;

      if (alive) {
        setTexto(final);
        setStatus(nextStatus);
      }
    };

    void run();
    const t = window.setInterval(run, 30_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [rssIds.join(","), fontes, mensagens, textosFixos.join("|")]);

  useEffect(() => {
    const gapPx = 48;
    const update = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;
      const cw = Math.max(1, container.clientWidth);
      const tw = Math.max(1, content.scrollWidth);
      const distancia = Math.max(1, tw + gapPx);
      setDistanciaPx((prev) => (Math.abs(prev - distancia) < 1 ? prev : distancia));
      const ratio = distancia / cw;
      const next = Math.max(10, Math.min(900, duracao * ratio));
      setDuracaoEfetiva((prev) => (Math.abs(prev - next) < 0.25 ? prev : next));
    };

    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro) {
      if (containerRef.current) ro.observe(containerRef.current);
      if (contentRef.current) ro.observe(contentRef.current);
    }
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, [duracao, texto, fontSize, padX, padY]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background, color: textColor, padding: `${padY}px ${padX}px` }}
    >
      <div ref={containerRef} className="absolute inset-0 flex items-center overflow-hidden">
        <div className="whitespace-nowrap" style={{ fontSize }}>
          {distanciaPx > 0 ? (
            <div
              className="flex will-change-transform"
              style={{
                ["--ticker-distance" as never]: `${distanciaPx}px`,
                animation: `ticker ${duracaoEfetiva}s linear infinite`,
              }}
            >
              <div ref={contentRef} className="shrink-0">
                {texto || " "}
              </div>
              <div aria-hidden="true" className="shrink-0 pl-12">
                {texto || " "}
              </div>
            </div>
          ) : (
            <div ref={contentRef} className="inline-block">
              {texto || " "}
            </div>
          )}
        </div>
      </div>
      {(status.startsWith("Falha") ||
        status === "Sem conteúdo" ||
        status === "Carregando RSS…") && (
        <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white/80">
          {status}
        </div>
      )}
      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(var(--ticker-distance) * -1));
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export function PlayerStage() {
  const hidratar = useAppStore((s) => s.hidratar);
  const hidratado = useAppStore((s) => s.hidratado);
  const layouts = useAppStore((s) => s.layouts);
  const zonas = useAppStore((s) => s.zonas);
  const timelineGlobal = useAppStore((s) => s.timelineGlobal);
  const agendamentos = useAppStore((s) => s.agendamentos);
  const settings = useAppStore((s) => s.player);
  const carregarTimelineZona = useAppStore((s) => s.carregarTimelineZona);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [origem, setOrigem] = useState<string>("vazio");
  const [timelines, setTimelines] = useState<Record<string, ZoneTimelineBlock[]>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    void hidratar();
  }, [hidratar]);

  useEffect(() => {
    if (!hidratado || !settings) return;
    const tick = () => {
      const chosen = escolherLayoutAtivo({
        agora: new Date(),
        settings,
        timelineGlobal,
        agendamentos,
      });
      setLayoutId(chosen.layoutId);
      setOrigem(chosen.origem);
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [hidratado, settings, timelineGlobal, agendamentos]);

  const zonasDoLayout = useMemo(() => {
    if (!layoutId) return [];
    return zonas
      .filter((z) => z.layoutId === layoutId)
      .slice()
      .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  }, [zonas, layoutId]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!layoutId) {
        setTimelines({});
        return;
      }
      const entries: Record<string, ZoneTimelineBlock[]> = {};
      for (const z of zonasDoLayout) {
        const all = await carregarTimelineZona(z.id);
        const filtrados =
          z.modoExibicao === "ticker"
            ? all.filter((b) => b.tipo === "rss" || b.tipo === "texto")
            : z.modoExibicao === "stream"
              ? all.filter((b) => b.tipo === "stream")
              : all.filter((b) => b.tipo === "media");
        entries[z.id] = filtrados.sort((a, b) => a.ordem - b.ordem);
      }
      if (alive) setTimelines(entries);
    };
    void run();
    return () => {
      alive = false;
    };
  }, [layoutId, zonasDoLayout.map((z) => z.id).join(","), carregarTimelineZona]);

  useEffect(() => {
    if (!hidratado || !settings?.iniciarTelaCheia) return;
    const el = stageRef.current;
    if (!el) return;
    const tryFs = async () => {
      if (document.fullscreenElement) return;
      try {
        await el.requestFullscreen();
      } catch {}
    };
    void tryFs();
  }, [hidratado, settings?.iniciarTelaCheia]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    onChange();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const layoutNome = useMemo(() => {
    if (!layoutId) return null;
    return layouts.find((l) => l.id === layoutId)?.nome ?? null;
  }, [layouts, layoutId]);

  return (
    <div ref={stageRef} className="fixed inset-0 bg-black">
      {!hidratado || !settings ? (
        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-300">
          Carregando…
        </div>
      ) : !layoutId ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-sm text-zinc-300">
          <div>Nenhum layout definido para exibição.</div>
          <div className="text-xs text-zinc-400">
            Configure a timeline global ou um agendamento.
          </div>
        </div>
      ) : (
        <div className="relative h-full w-full">
          {zonasDoLayout.map((z) => (
            <div
              key={z.id}
              className="absolute overflow-hidden bg-black"
              style={{
                left: `${z.posX}%`,
                top: `${z.posY}%`,
                width: `${z.width}%`,
                height: `${z.height}%`,
                zIndex: z.zIndex ?? 0,
              }}
            >
              {z.modoExibicao === "ticker" ? (
                <ZoneTicker zone={z} blocks={timelines[z.id] ?? []} />
              ) : z.modoExibicao === "stream" ? (
                <ZoneStream blocks={timelines[z.id] ?? []} />
              ) : (
                <ZoneMedia blocks={timelines[z.id] ?? []} />
              )}
            </div>
          ))}

          {!isFullscreen && (
            <button
              type="button"
              onClick={() => stageRef.current?.requestFullscreen?.()}
              className="absolute right-4 top-4 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-black"
            >
              Entrar em tela cheia
            </button>
          )}
        </div>
      )}
    </div>
  );
}

