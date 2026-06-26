"use client";

import { create } from "zustand";
import type {
  Layout,
  LayoutTimelineItem,
  MarketingMessage,
  MediaItem,
  MediaType,
  PlayerSettings,
  RssSource,
  ScheduleItem,
  Zone,
  ZoneDisplayMode,
  ZoneTimelineBlock,
} from "@/lib/types";
import {
  addMedia,
  createLayout,
  createMarketingMessage,
  createRssSource,
  createSchedule,
  createZone,
  deleteLayout,
  deleteMarketingMessage,
  deleteMedia,
  deleteRssSource,
  deleteSchedule,
  deleteZone,
  listLayouts,
  listLayoutTimeline,
  listMarketingMessages,
  listMedia,
  listRssSources,
  listSchedules,
  listZones,
  listZoneTimeline,
  putLayoutTimeline,
  putZoneTimelineBlocks,
  toggleLayoutAtivo,
  toggleMarketingMessageAtivo,
  toggleMediaAtivo,
  upsertRssSource,
  updateZone,
} from "@/lib/repo";
import { getPlayerSettings, setPlayerSettings } from "@/lib/db";

type AppState = {
  hidratado: boolean;
  carregando: boolean;
  midias: MediaItem[];
  fontesRss: RssSource[];
  mensagensMarketing: MarketingMessage[];
  layouts: Layout[];
  zonas: Zone[];
  timelineGlobal: LayoutTimelineItem[];
  agendamentos: ScheduleItem[];
  player: PlayerSettings | null;

  hidratar: () => Promise<void>;

  criarMidia: (input: {
    file: File;
    nome?: string;
    tags?: string[];
  }) => Promise<void>;
  alternarMidiaAtiva: (id: string, ativo: boolean) => Promise<void>;
  removerMidia: (id: string) => Promise<void>;

  criarFonteRss: (nome: string, url: string) => Promise<void>;
  salvarFonteRss: (source: RssSource) => Promise<void>;
  removerFonteRss: (id: string) => Promise<void>;

  criarMensagemMarketing: (texto: string, peso: number) => Promise<void>;
  alternarMensagemMarketingAtiva: (id: string, ativo: boolean) => Promise<void>;
  removerMensagemMarketing: (id: string) => Promise<void>;

  criarLayout: (nome: string) => Promise<void>;
  alternarLayoutAtivo: (id: string, ativo: boolean) => Promise<void>;
  removerLayout: (id: string) => Promise<void>;

  criarZona: (input: {
    layoutId: string;
    nome: string;
    posX: number;
    posY: number;
    width: number;
    height: number;
    zIndex?: number;
    modoExibicao: ZoneDisplayMode;
    tickerFontePx?: number;
    tickerBackground?: string;
    tickerDuracaoSegundos?: number;
    tickerTextColor?: string;
    tickerPaddingX?: number;
    tickerPaddingY?: number;
  }) => Promise<void>;
  salvarZona: (zone: Zone) => Promise<void>;
  removerZona: (id: string) => Promise<void>;

  carregarTimelineZona: (zoneId: string) => Promise<ZoneTimelineBlock[]>;
  salvarTimelineZona: (zoneId: string, blocks: ZoneTimelineBlock[]) => Promise<void>;

  salvarTimelineGlobal: (items: LayoutTimelineItem[]) => Promise<void>;

  criarAgendamento: (layoutId: string, dataInicio: string, dataFim: string) => Promise<void>;
  removerAgendamento: (id: string) => Promise<void>;

  salvarPlayer: (value: PlayerSettings) => Promise<void>;
};

function inferMediaType(file: File): MediaType {
  if (file.type.startsWith("video/")) return "video";
  return "imagem";
}

export const useAppStore = create<AppState>((set, get) => ({
  hidratado: false,
  carregando: false,
  midias: [],
  fontesRss: [],
  mensagensMarketing: [],
  layouts: [],
  zonas: [],
  timelineGlobal: [],
  agendamentos: [],
  player: null,

  hidratar: async () => {
    if (get().carregando || get().hidratado) return;
    set({ carregando: true });
    const [
      midias,
      fontesRss,
      mensagensMarketing,
      layouts,
      zonas,
      timelineGlobal,
      agendamentos,
      player,
    ] = await Promise.all([
      listMedia(),
      listRssSources(),
      listMarketingMessages(),
      listLayouts(),
      listZones(),
      listLayoutTimeline(),
      listSchedules(),
      getPlayerSettings(),
    ]);
    set({
      midias,
      fontesRss,
      mensagensMarketing,
      layouts,
      zonas,
      timelineGlobal,
      agendamentos,
      player,
      hidratado: true,
      carregando: false,
    });
  },

  criarMidia: async ({ file, nome, tags }) => {
    const item = await addMedia({
      nome: nome?.trim() ? nome.trim() : file.name,
      tipo: inferMediaType(file),
      mimeType: file.type || "application/octet-stream",
      tags: (tags ?? []).filter(Boolean),
      blob: file,
    });
    set({ midias: [item, ...get().midias] });
  },
  alternarMidiaAtiva: async (id, ativo) => {
    await toggleMediaAtivo(id, ativo);
    set({
      midias: get().midias.map((m) => (m.id === id ? { ...m, ativo } : m)),
    });
  },
  removerMidia: async (id) => {
    await deleteMedia(id);
    set({ midias: get().midias.filter((m) => m.id !== id) });
  },

  criarFonteRss: async (nome, url) => {
    const item = await createRssSource({ nome, url });
    set({ fontesRss: [item, ...get().fontesRss] });
  },
  salvarFonteRss: async (source) => {
    const item = await upsertRssSource(source);
    set({
      fontesRss: get().fontesRss.map((s) => (s.id === item.id ? item : s)),
    });
  },
  removerFonteRss: async (id) => {
    await deleteRssSource(id);
    set({ fontesRss: get().fontesRss.filter((s) => s.id !== id) });
  },

  criarMensagemMarketing: async (texto, peso) => {
    const item = await createMarketingMessage({ texto, peso });
    set({ mensagensMarketing: [item, ...get().mensagensMarketing] });
  },
  alternarMensagemMarketingAtiva: async (id, ativo) => {
    await toggleMarketingMessageAtivo(id, ativo);
    set({
      mensagensMarketing: get().mensagensMarketing.map((m) =>
        m.id === id ? { ...m, ativo } : m,
      ),
    });
  },
  removerMensagemMarketing: async (id) => {
    await deleteMarketingMessage(id);
    set({
      mensagensMarketing: get().mensagensMarketing.filter((m) => m.id !== id),
    });
  },

  criarLayout: async (nome) => {
    const item = await createLayout({ nome });
    set({ layouts: [item, ...get().layouts] });
  },
  alternarLayoutAtivo: async (id, ativo) => {
    await toggleLayoutAtivo(id, ativo);
    set({
      layouts: get().layouts.map((l) => (l.id === id ? { ...l, ativo } : l)),
    });
  },
  removerLayout: async (id) => {
    await deleteLayout(id);
    set({
      layouts: get().layouts.filter((l) => l.id !== id),
      zonas: get().zonas.filter((z) => z.layoutId !== id),
    });
  },

  criarZona: async (input) => {
    const zone = await createZone(input);
    set({ zonas: [zone, ...get().zonas] });
  },
  salvarZona: async (zone) => {
    await updateZone(zone);
    set({
      zonas: get().zonas.map((z) => (z.id === zone.id ? zone : z)),
    });
  },
  removerZona: async (id) => {
    await deleteZone(id);
    set({ zonas: get().zonas.filter((z) => z.id !== id) });
  },

  carregarTimelineZona: async (zoneId) => {
    return listZoneTimeline(zoneId);
  },
  salvarTimelineZona: async (zoneId, blocks) => {
    await putZoneTimelineBlocks(zoneId, blocks);
  },

  salvarTimelineGlobal: async (items) => {
    await putLayoutTimeline(items);
    set({ timelineGlobal: items });
  },

  criarAgendamento: async (layoutId, dataInicio, dataFim) => {
    const item = await createSchedule({ layoutId, dataInicio, dataFim });
    set({ agendamentos: [item, ...get().agendamentos] });
  },
  removerAgendamento: async (id) => {
    await deleteSchedule(id);
    set({ agendamentos: get().agendamentos.filter((a) => a.id !== id) });
  },

  salvarPlayer: async (value) => {
    await setPlayerSettings(value);
    set({ player: value });
  },
}));

