import { nanoid } from "nanoid";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
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

export function createId() {
  return nanoid();
}

type MediaRow = {
  id: string;
  nome: string;
  tipo: MediaType;
  mime_type: string | null;
  tags: string[] | null;
  ativo: boolean;
  r2_key: string;
  public_url: string;
  created_at: string;
};

type RssSourceRow = {
  id: string;
  nome: string;
  url: string;
  ativo: boolean;
  created_at: string;
};

type MarketingMessageRow = {
  id: string;
  texto: string;
  ativo: boolean;
  peso: number;
  created_at: string;
};

type LayoutRow = {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
};

type ZoneRow = {
  id: string;
  layout_id: string;
  nome: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  z_index: number;
  modo_exibicao: ZoneDisplayMode;
  ticker_fonte_px: number | null;
  ticker_background: string | null;
  ticker_duracao_segundos: number | null;
  ticker_text_color: string | null;
  ticker_padding_x: number | null;
  ticker_padding_y: number | null;
};

type ZoneTimelineRow = {
  id: string;
  zone_id: string;
  tipo: ZoneTimelineBlock["tipo"];
  media_id: string | null;
  rss_source_id: string | null;
  texto: string | null;
  stream_url: string | null;
  duracao: number;
  ordem: number;
  config: Record<string, unknown> | null;
};

type LayoutTimelineRow = {
  id: string;
  layout_id: string;
  duracao: number;
  ordem: number;
};

type ScheduleRow = {
  id: string;
  layout_id: string;
  data_inicio: string;
  data_fim: string;
};

function mediaFromRow(row: MediaRow): MediaItem {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    mimeType: row.mime_type ?? "application/octet-stream",
    tags: row.tags ?? [],
    ativo: row.ativo,
    r2Key: row.r2_key,
    publicUrl: row.public_url,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function rssFromRow(row: RssSourceRow): RssSource {
  return {
    id: row.id,
    nome: row.nome,
    url: row.url,
    ativo: row.ativo,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function marketingFromRow(row: MarketingMessageRow): MarketingMessage {
  return {
    id: row.id,
    texto: row.texto,
    ativo: row.ativo,
    peso: row.peso,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function layoutFromRow(row: LayoutRow): Layout {
  return {
    id: row.id,
    nome: row.nome,
    ativo: row.ativo,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function zoneFromRow(row: ZoneRow): Zone {
  return {
    id: row.id,
    layoutId: row.layout_id,
    nome: row.nome,
    posX: Number(row.pos_x),
    posY: Number(row.pos_y),
    width: Number(row.width),
    height: Number(row.height),
    zIndex: row.z_index,
    modoExibicao: row.modo_exibicao,
    tickerFontePx: row.ticker_fonte_px ?? undefined,
    tickerBackground: row.ticker_background ?? undefined,
    tickerDuracaoSegundos: row.ticker_duracao_segundos ?? undefined,
    tickerTextColor: row.ticker_text_color ?? undefined,
    tickerPaddingX: row.ticker_padding_x ?? undefined,
    tickerPaddingY: row.ticker_padding_y ?? undefined,
  };
}

function blockFromRow(row: ZoneTimelineRow): ZoneTimelineBlock {
  return {
    id: row.id,
    zoneId: row.zone_id,
    tipo: row.tipo,
    mediaId: row.media_id ?? undefined,
    rssSourceId: row.rss_source_id ?? undefined,
    texto: row.texto ?? undefined,
    streamUrl: row.stream_url ?? undefined,
    duracao: row.duracao,
    ordem: row.ordem,
    config: row.config ?? {},
  };
}

export async function listMedia() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("media").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as MediaRow[]).map(mediaFromRow);
}

export async function addMedia(input: {
  nome: string;
  tipo: MediaType;
  mimeType: string;
  tags: string[];
  blob: Blob;
}) {
  const form = new FormData();
  form.append("file", input.blob);
  form.append("nome", input.nome);
  form.append("tipo", input.tipo);
  form.append("mimeType", input.mimeType);
  form.append("tags", JSON.stringify(input.tags));

  const res = await fetch("/api/media/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Falha ao enviar a mídia.");
  const item = (await res.json()) as MediaItem;
  return item;
}

export async function toggleMediaAtivo(id: string, ativo: boolean) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("media").update({ ativo }).eq("id", id);
  if (error) throw error;
}

export async function deleteMedia(id: string) {
  const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Falha ao excluir a mídia.");
}

export async function listRssSources() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("rss_sources").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as RssSourceRow[]).map(rssFromRow);
}

export async function upsertRssSource(input: Omit<RssSource, "createdAt">) {
  const supabase = getSupabaseBrowserClient();
  const payload = {
    id: input.id,
    nome: input.nome,
    url: input.url,
    ativo: input.ativo,
  };
  const { data, error } = await supabase.from("rss_sources").upsert(payload).select("*").single();
  if (error) throw error;
  return rssFromRow(data as RssSourceRow);
}

export async function createRssSource(input: { nome: string; url: string }) {
  return upsertRssSource({
    id: createId(),
    nome: input.nome,
    url: input.url,
    ativo: true,
  });
}

export async function deleteRssSource(id: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("rss_sources").delete().eq("id", id);
  if (error) throw error;
}

export async function listMarketingMessages() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("marketing_messages").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as MarketingMessageRow[]).map(marketingFromRow);
}

export async function createMarketingMessage(input: {
  texto: string;
  peso: number;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("marketing_messages")
    .insert({ texto: input.texto, peso: input.peso, ativo: true })
    .select("*")
    .single();
  if (error) throw error;
  return marketingFromRow(data as MarketingMessageRow);
}

export async function toggleMarketingMessageAtivo(id: string, ativo: boolean) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("marketing_messages").update({ ativo }).eq("id", id);
  if (error) throw error;
}

export async function deleteMarketingMessage(id: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("marketing_messages").delete().eq("id", id);
  if (error) throw error;
}

export async function listLayouts() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("layouts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as LayoutRow[]).map(layoutFromRow);
}

export async function createLayout(input: { nome: string }) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("layouts")
    .insert({ nome: input.nome, ativo: true })
    .select("*")
    .single();
  if (error) throw error;
  return layoutFromRow(data as LayoutRow);
}

export async function toggleLayoutAtivo(id: string, ativo: boolean) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("layouts").update({ ativo }).eq("id", id);
  if (error) throw error;
}

export async function deleteLayout(id: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("layouts").delete().eq("id", id);
  if (error) throw error;
}

export async function listZones() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("zones").select("*");
  if (error) throw error;
  return (data as ZoneRow[]).map(zoneFromRow);
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
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("zones")
    .insert({
      layout_id: input.layoutId,
      nome: input.nome,
      pos_x: input.posX,
      pos_y: input.posY,
      width: input.width,
      height: input.height,
      z_index: input.zIndex ?? 0,
      modo_exibicao: input.modoExibicao,
      ticker_fonte_px: input.tickerFontePx ?? null,
      ticker_background: input.tickerBackground ?? null,
      ticker_duracao_segundos: input.tickerDuracaoSegundos ?? null,
      ticker_text_color: input.tickerTextColor ?? null,
      ticker_padding_x: input.tickerPaddingX ?? null,
      ticker_padding_y: input.tickerPaddingY ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return zoneFromRow(data as ZoneRow);
}

export async function updateZone(zone: Zone) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("zones")
    .update({
      layout_id: zone.layoutId,
      nome: zone.nome,
      pos_x: zone.posX,
      pos_y: zone.posY,
      width: zone.width,
      height: zone.height,
      z_index: zone.zIndex ?? 0,
      modo_exibicao: zone.modoExibicao,
      ticker_fonte_px: zone.tickerFontePx ?? null,
      ticker_background: zone.tickerBackground ?? null,
      ticker_duracao_segundos: zone.tickerDuracaoSegundos ?? null,
      ticker_text_color: zone.tickerTextColor ?? null,
      ticker_padding_x: zone.tickerPaddingX ?? null,
      ticker_padding_y: zone.tickerPaddingY ?? null,
    })
    .eq("id", zone.id);
  if (error) throw error;
}

export async function deleteZone(id: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("zones").delete().eq("id", id);
  if (error) throw error;
}

export async function listZoneTimeline(zoneId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("zone_timeline")
    .select("*")
    .eq("zone_id", zoneId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data as ZoneTimelineRow[]).map(blockFromRow);
}

export async function putZoneTimelineBlocks(zoneId: string, blocks: ZoneTimelineBlock[]) {
  const supabase = getSupabaseBrowserClient();
  const { error: deleteError } = await supabase.from("zone_timeline").delete().eq("zone_id", zoneId);
  if (deleteError) throw deleteError;
  if (!blocks.length) return;
  const payload = blocks.map((b, idx) => ({
    id: b.id,
    zone_id: zoneId,
    tipo: b.tipo,
    media_id: b.mediaId ?? null,
    rss_source_id: b.rssSourceId ?? null,
    texto: b.texto ?? null,
    stream_url: b.streamUrl ?? null,
    duracao: b.duracao,
    ordem: idx + 1,
    config: b.config ?? {},
  }));
  const { error } = await supabase.from("zone_timeline").insert(payload);
  if (error) throw error;
}

export async function listLayoutTimeline() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("layout_timeline").select("*").order("ordem", { ascending: true });
  if (error) throw error;
  return (data as LayoutTimelineRow[]).map((row) => ({
    id: row.id,
    layoutId: row.layout_id,
    duracao: row.duracao,
    ordem: row.ordem,
  }));
}

export async function putLayoutTimeline(items: LayoutTimelineItem[]) {
  const supabase = getSupabaseBrowserClient();
  const { error: deleteError } = await supabase.from("layout_timeline").delete().neq("id", "");
  if (deleteError) throw deleteError;
  if (!items.length) return;
  const { error } = await supabase.from("layout_timeline").insert(
    items.map((item, idx) => ({
      id: item.id,
      layout_id: item.layoutId,
      duracao: item.duracao,
      ordem: idx + 1,
    })),
  );
  if (error) throw error;
}

export async function listSchedules() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("schedules").select("*").order("data_inicio", { ascending: false });
  if (error) throw error;
  return (data as ScheduleRow[]).map((row) => ({
    id: row.id,
    layoutId: row.layout_id,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
  }));
}

export async function createSchedule(input: {
  layoutId: string;
  dataInicio: string;
  dataFim: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      layout_id: input.layoutId,
      data_inicio: input.dataInicio,
      data_fim: input.dataFim,
    })
    .select("*")
    .single();
  if (error) throw error;
  const row = data as ScheduleRow;
  return {
    id: row.id,
    layoutId: row.layout_id,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
  };
}

export async function deleteSchedule(id: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}

