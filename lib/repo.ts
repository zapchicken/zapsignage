import type {
  Layout,
  LayoutTimelineItem,
  MarketingMessage,
  MediaItem,
  MediaType,
  RssSource,
  Zone,
  ZoneDisplayMode,
  ZoneTimelineBlock,
} from "@/lib/types";

type BootstrapPayload = {
  midias: MediaItem[];
  fontesRss: RssSource[];
  mensagensMarketing: MarketingMessage[];
  layouts: Layout[];
  zonas: Zone[];
  timelineGlobal: LayoutTimelineItem[];
  agendamentos: Array<{
    id: string;
    layoutId: string;
    dataInicio: string;
    dataFim: string;
  }>;
  player: import("@/lib/types").PlayerSettings;
};

export function createId() {
  return crypto.randomUUID();
}

async function readJsonError(response: Response) {
  try {
    const data = (await response.json()) as { erro?: string };
    return data.erro ?? "Falha na operação.";
  } catch {
    return "Falha na operação.";
  }
}

async function adminAction<T>(action: string, payload?: unknown): Promise<T> {
  const response = await fetch("/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, payload }),
  });
  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }
  return (await response.json()) as T;
}

export async function loadBootstrapData() {
  const response = await fetch("/api/admin", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }
  return (await response.json()) as BootstrapPayload;
}

export async function addMedia(input: {
  nome: string;
  tipo: MediaType;
  mimeType: string;
  tags: string[];
  file: File;
}) {
  const initRes = await fetch("/api/media/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: input.file.name,
      tipo: input.tipo,
      mimeType: input.mimeType,
      fileSize: input.file.size,
    }),
  });
  if (!initRes.ok) throw new Error(await readJsonError(initRes));

  const upload = (await initRes.json()) as {
    id: string;
    r2Key: string;
    uploadUrl: string;
    publicUrl: string;
  };

  const uploadRes = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": input.mimeType,
    },
    body: input.file,
  }).catch(() => {
    throw new Error(
      "Falha ao enviar o arquivo diretamente para o Cloudflare R2. Verifique o CORS do bucket para o domínio do painel.",
    );
  });
  if (!uploadRes.ok) {
    throw new Error("Falha ao enviar o arquivo diretamente para o Cloudflare R2.");
  }

  const completeRes = await fetch("/api/media/upload-complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: upload.id,
      nome: input.nome,
      tipo: input.tipo,
      mimeType: input.mimeType,
      tags: input.tags,
      r2Key: upload.r2Key,
      publicUrl: upload.publicUrl,
    }),
  });
  if (!completeRes.ok) throw new Error(await readJsonError(completeRes));

  return (await completeRes.json()) as MediaItem;
}

export async function toggleMediaAtivo(id: string, ativo: boolean) {
  await adminAction<{ ok: true }>("toggleMediaAtivo", { id, ativo });
}

export async function deleteMedia(id: string) {
  const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Falha ao excluir a mídia.");
}

export async function upsertRssSource(input: Omit<RssSource, "createdAt">) {
  return adminAction<RssSource>("upsertRssSource", {
    id: input.id,
    nome: input.nome,
    url: input.url,
    ativo: input.ativo,
  });
}

export async function createRssSource(input: { nome: string; url: string }) {
  return adminAction<RssSource>("createRssSource", input);
}

export async function deleteRssSource(id: string) {
  await adminAction<{ ok: true }>("deleteRssSource", { id });
}

export async function createMarketingMessage(input: {
  texto: string;
  peso: number;
}) {
  return adminAction<MarketingMessage>("createMarketingMessage", input);
}

export async function toggleMarketingMessageAtivo(id: string, ativo: boolean) {
  await adminAction<{ ok: true }>("toggleMarketingMessageAtivo", { id, ativo });
}

export async function deleteMarketingMessage(id: string) {
  await adminAction<{ ok: true }>("deleteMarketingMessage", { id });
}

export async function createLayout(input: { nome: string }) {
  return adminAction<Layout>("createLayout", input);
}

export async function toggleLayoutAtivo(id: string, ativo: boolean) {
  await adminAction<{ ok: true }>("toggleLayoutAtivo", { id, ativo });
}

export async function deleteLayout(id: string) {
  await adminAction<{ ok: true }>("deleteLayout", { id });
}

export async function createZone(input: {
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
}) {
  return adminAction<Zone>("createZone", input);
}

export async function updateZone(zone: Zone) {
  await adminAction<{ ok: true }>("updateZone", zone);
}

export async function deleteZone(id: string) {
  await adminAction<{ ok: true }>("deleteZone", { id });
}

export async function listZoneTimeline(zoneId: string) {
  return adminAction<ZoneTimelineBlock[]>("listZoneTimeline", { zoneId });
}

export async function putZoneTimelineBlocks(zoneId: string, blocks: ZoneTimelineBlock[]) {
  await adminAction<{ ok: true }>("putZoneTimelineBlocks", { zoneId, blocks });
}

export async function putLayoutTimeline(items: LayoutTimelineItem[]) {
  await adminAction<{ ok: true }>("putLayoutTimeline", { items });
}

export async function createSchedule(input: {
  layoutId: string;
  dataInicio: string;
  dataFim: string;
}) {
  return adminAction<{
    id: string;
    layoutId: string;
    dataInicio: string;
    dataFim: string;
  }>("createSchedule", input);
}

export async function deleteSchedule(id: string) {
  await adminAction<{ ok: true }>("deleteSchedule", { id });
}

