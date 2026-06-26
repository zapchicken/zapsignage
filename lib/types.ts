export type MediaType = "video" | "imagem";

export type MediaItem = {
  id: string;
  nome: string;
  tipo: MediaType;
  mimeType: string;
  tags: string[];
  ativo: boolean;
  r2Key: string;
  publicUrl: string;
  createdAt: number;
};

export type RssSource = {
  id: string;
  nome: string;
  url: string;
  ativo: boolean;
  createdAt: number;
};

export type MarketingMessage = {
  id: string;
  texto: string;
  ativo: boolean;
  peso: number;
  createdAt: number;
};

export type Layout = {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: number;
};

export type ZoneDisplayMode = "video" | "imagem" | "ticker" | "stream";

export type Zone = {
  id: string;
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
};

export type TimelineBlockType = "media" | "rss" | "texto" | "stream";

export type ZoneTimelineBlock = {
  id: string;
  zoneId: string;
  tipo: TimelineBlockType;
  mediaId?: string;
  rssSourceId?: string;
  texto?: string;
  streamUrl?: string;
  duracao: number;
  ordem: number;
  config: Record<string, unknown>;
};

export type LayoutTimelineItem = {
  id: string;
  layoutId: string;
  duracao: number;
  ordem: number;
};

export type ScheduleItem = {
  id: string;
  layoutId: string;
  dataInicio: string;
  dataFim: string;
};

export type PlayerSettings = {
  resolucao: string;
  efeitoTransicao:
    | "fade"
    | "slide"
    | "slideRight"
    | "slideUp"
    | "slideDown"
    | "zoomIn"
    | "zoomOut"
    | "flipX"
    | "flipY"
    | "rotateIn"
    | "blurIn"
    | "wipe";
  volume: number;
  iniciarTelaCheia: boolean;
  modoEmergenciaAtivo: boolean;
  layoutEmergenciaId?: string;
};

