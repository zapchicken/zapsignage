import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { PlayerSettings } from "@/lib/types";

type PlayerSettingsRow = {
  resolucao: string | null;
  efeito_transicao: PlayerSettings["efeitoTransicao"] | null;
  volume: number | null;
  iniciar_tela_cheia: boolean | null;
  modo_emergencia_ativo: boolean | null;
  layout_emergencia_id: string | null;
};

export const defaultPlayerSettings: PlayerSettings = {
  resolucao: "1920x1080",
  efeitoTransicao: "fade",
  volume: 0.8,
  iniciarTelaCheia: true,
  modoEmergenciaAtivo: false,
};

export async function getPlayerSettings(): Promise<PlayerSettings> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("player_settings")
    .select("*")
    .eq("id", "playerSettings")
    .maybeSingle();
  if (error || !data) return defaultPlayerSettings;
  const row = data as PlayerSettingsRow;
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

export async function setPlayerSettings(value: PlayerSettings) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("player_settings").upsert({
    id: "playerSettings",
    resolucao: value.resolucao,
    efeito_transicao: value.efeitoTransicao,
    volume: value.volume,
    iniciar_tela_cheia: value.iniciarTelaCheia,
    modo_emergencia_ativo: value.modoEmergenciaAtivo,
    layout_emergencia_id: value.layoutEmergenciaId ?? null,
  });
  if (error) throw error;
}

