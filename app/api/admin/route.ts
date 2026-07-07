import { NextResponse } from "next/server";
import { requireAdminSessionJson } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
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

const defaultPlayerSettings: PlayerSettings = {
  resolucao: "1920x1080",
  efeitoTransicao: "fade",
  volume: 0.8,
  iniciarTelaCheia: true,
  modoEmergenciaAtivo: false,
};

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
  z_index: number | null;
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

type PlayerSettingsRow = {
  resolucao: string | null;
  efeito_transicao: PlayerSettings["efeitoTransicao"] | null;
  volume: number | null;
  iniciar_tela_cheia: boolean | null;
  modo_emergencia_ativo: boolean | null;
  layout_emergencia_id: string | null;
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
    zIndex: row.z_index ?? 0,
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

function scheduleFromRow(row: ScheduleRow): ScheduleItem {
  return {
    id: row.id,
    layoutId: row.layout_id,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
  };
}

function layoutTimelineFromRow(row: LayoutTimelineRow): LayoutTimelineItem {
  return {
    id: row.id,
    layoutId: row.layout_id,
    duracao: row.duracao,
    ordem: row.ordem,
  };
}

function playerFromRow(row: PlayerSettingsRow | null | undefined): PlayerSettings {
  if (!row) return defaultPlayerSettings;
  return {
    resolucao: row.resolucao ?? defaultPlayerSettings.resolucao,
    efeitoTransicao: row.efeito_transicao ?? defaultPlayerSettings.efeitoTransicao,
    volume: Number(row.volume ?? defaultPlayerSettings.volume),
    iniciarTelaCheia: row.iniciar_tela_cheia ?? defaultPlayerSettings.iniciarTelaCheia,
    modoEmergenciaAtivo:
      row.modo_emergencia_ativo ?? defaultPlayerSettings.modoEmergenciaAtivo,
    layoutEmergenciaId: row.layout_emergencia_id ?? undefined,
  };
}

function filterItemsWithValidLayout<T extends { layoutId: string }>(
  items: T[],
  validLayoutIds: Set<string>,
) {
  return items.filter((item) => validLayoutIds.has(item.layoutId));
}

function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Erro interno.";
  return NextResponse.json({ erro: message }, { status });
}

export async function GET() {
  const unauthorized = await requireAdminSessionJson();
  if (unauthorized) return unauthorized;

  try {
    const supabase = getSupabaseServerClient();
    const [
      mediaRes,
      rssRes,
      marketingRes,
      layoutsRes,
      zonesRes,
      layoutTimelineRes,
      schedulesRes,
      playerRes,
    ] = await Promise.all([
      supabase.from("media").select("*").order("created_at", { ascending: false }),
      supabase.from("rss_sources").select("*").order("created_at", { ascending: false }),
      supabase.from("marketing_messages").select("*").order("created_at", { ascending: false }),
      supabase.from("layouts").select("*").order("created_at", { ascending: false }),
      supabase.from("zones").select("*"),
      supabase.from("layout_timeline").select("*").order("ordem", { ascending: true }),
      supabase.from("schedules").select("*").order("data_inicio", { ascending: false }),
      supabase.from("player_settings").select("*").eq("id", "playerSettings").maybeSingle(),
    ]);

    const firstError =
      mediaRes.error ??
      rssRes.error ??
      marketingRes.error ??
      layoutsRes.error ??
      zonesRes.error ??
      layoutTimelineRes.error ??
      schedulesRes.error ??
      playerRes.error;
    if (firstError) throw new Error(firstError.message);

    const layouts = (layoutsRes.data as LayoutRow[]).map(layoutFromRow);
    const validLayoutIds = new Set(layouts.map((layout) => layout.id));
    const timelineGlobal = filterItemsWithValidLayout(
      (layoutTimelineRes.data as LayoutTimelineRow[]).map(layoutTimelineFromRow),
      validLayoutIds,
    );
    const agendamentos = filterItemsWithValidLayout(
      (schedulesRes.data as ScheduleRow[]).map(scheduleFromRow),
      validLayoutIds,
    );

    return NextResponse.json({
      midias: (mediaRes.data as MediaRow[]).map(mediaFromRow),
      fontesRss: (rssRes.data as RssSourceRow[]).map(rssFromRow),
      mensagensMarketing: (marketingRes.data as MarketingMessageRow[]).map(marketingFromRow),
      layouts,
      zonas: (zonesRes.data as ZoneRow[]).map(zoneFromRow),
      timelineGlobal,
      agendamentos,
      player: playerFromRow((playerRes.data as PlayerSettingsRow | null) ?? null),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSessionJson();
  if (unauthorized) return unauthorized;

  try {
    const { action, payload } = (await request.json()) as {
      action?: string;
      payload?: unknown;
    };
    const supabase = getSupabaseServerClient();

    switch (action) {
      case "toggleMediaAtivo": {
        const input = payload as { id: string; ativo: boolean };
        const { error } = await supabase.from("media").update({ ativo: input.ativo }).eq("id", input.id);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "createRssSource":
      case "upsertRssSource": {
        const input = payload as { id?: string; nome: string; url: string; ativo?: boolean };
        const { data, error } = await supabase
          .from("rss_sources")
          .upsert({
            id: input.id ?? crypto.randomUUID(),
            nome: input.nome,
            url: input.url,
            ativo: input.ativo ?? true,
          })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return NextResponse.json(rssFromRow(data as RssSourceRow));
      }

      case "deleteRssSource": {
        const input = payload as { id: string };
        const { error } = await supabase.from("rss_sources").delete().eq("id", input.id);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "createMarketingMessage": {
        const input = payload as { texto: string; peso: number };
        const { data, error } = await supabase
          .from("marketing_messages")
          .insert({ texto: input.texto, peso: input.peso, ativo: true })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return NextResponse.json(marketingFromRow(data as MarketingMessageRow));
      }

      case "toggleMarketingMessageAtivo": {
        const input = payload as { id: string; ativo: boolean };
        const { error } = await supabase
          .from("marketing_messages")
          .update({ ativo: input.ativo })
          .eq("id", input.id);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "deleteMarketingMessage": {
        const input = payload as { id: string };
        const { error } = await supabase.from("marketing_messages").delete().eq("id", input.id);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "createLayout": {
        const input = payload as { nome: string };
        const { data, error } = await supabase
          .from("layouts")
          .insert({ nome: input.nome, ativo: true })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return NextResponse.json(layoutFromRow(data as LayoutRow));
      }

      case "toggleLayoutAtivo": {
        const input = payload as { id: string; ativo: boolean };
        const { error } = await supabase.from("layouts").update({ ativo: input.ativo }).eq("id", input.id);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "deleteLayout": {
        const input = payload as { id: string };
        const { error } = await supabase.from("layouts").delete().eq("id", input.id);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "createZone": {
        const input = payload as Omit<Zone, "id">;
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
        if (error) throw new Error(error.message);
        return NextResponse.json(zoneFromRow(data as ZoneRow));
      }

      case "updateZone": {
        const zone = payload as Zone;
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
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "deleteZone": {
        const input = payload as { id: string };
        const { error } = await supabase.from("zones").delete().eq("id", input.id);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "listZoneTimeline": {
        const input = payload as { zoneId: string };
        const { data, error } = await supabase
          .from("zone_timeline")
          .select("*")
          .eq("zone_id", input.zoneId)
          .order("ordem", { ascending: true });
        if (error) throw new Error(error.message);
        return NextResponse.json((data as ZoneTimelineRow[]).map(blockFromRow));
      }

      case "putZoneTimelineBlocks": {
        const input = payload as { zoneId: string; blocks: ZoneTimelineBlock[] };
        const { error: deleteError } = await supabase
          .from("zone_timeline")
          .delete()
          .eq("zone_id", input.zoneId);
        if (deleteError) throw new Error(deleteError.message);
        if (input.blocks.length) {
          const { error } = await supabase.from("zone_timeline").insert(
            input.blocks.map((block, index) => ({
              id: block.id,
              zone_id: input.zoneId,
              tipo: block.tipo,
              media_id: block.mediaId ?? null,
              rss_source_id: block.rssSourceId ?? null,
              texto: block.texto ?? null,
              stream_url: block.streamUrl ?? null,
              duracao: block.duracao,
              ordem: index + 1,
              config: block.config ?? {},
            })),
          );
          if (error) throw new Error(error.message);
        }
        return NextResponse.json({ ok: true });
      }

      case "putLayoutTimeline": {
        const input = payload as { items: LayoutTimelineItem[] };
        const { data: layoutsData, error: layoutsError } = await supabase
          .from("layouts")
          .select("id");
        if (layoutsError) throw new Error(layoutsError.message);

        const validLayoutIds = new Set(
          ((layoutsData ?? []) as Array<{ id: string }>).map((layout) => layout.id),
        );
        const validItems = filterItemsWithValidLayout(input.items, validLayoutIds);

        const { error: deleteError } = await supabase.from("layout_timeline").delete().neq("id", "");
        if (deleteError) throw new Error(deleteError.message);
        if (validItems.length) {
          const { error } = await supabase.from("layout_timeline").insert(
            validItems.map((item, index) => ({
              id: item.id,
              layout_id: item.layoutId,
              duracao: item.duracao,
              ordem: index + 1,
            })),
          );
          if (error) throw new Error(error.message);
        }
        return NextResponse.json({ ok: true });
      }

      case "createSchedule": {
        const input = payload as { layoutId: string; dataInicio: string; dataFim: string };
        const { data, error } = await supabase
          .from("schedules")
          .insert({
            layout_id: input.layoutId,
            data_inicio: input.dataInicio,
            data_fim: input.dataFim,
          })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return NextResponse.json(scheduleFromRow(data as ScheduleRow));
      }

      case "deleteSchedule": {
        const input = payload as { id: string };
        const { error } = await supabase.from("schedules").delete().eq("id", input.id);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "setPlayerSettings": {
        const value = payload as PlayerSettings;
        const { error } = await supabase.from("player_settings").upsert({
          id: "playerSettings",
          resolucao: value.resolucao,
          efeito_transicao: value.efeitoTransicao,
          volume: value.volume,
          iniciar_tela_cheia: value.iniciarTelaCheia,
          modo_emergencia_ativo: value.modoEmergenciaAtivo,
          layout_emergencia_id: value.layoutEmergenciaId ?? null,
        });
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
