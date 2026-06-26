import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { PlayerSettings } from "@/lib/types";

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
  return {
    resolucao: data.resolucao ?? defaultPlayerSettings.resolucao,
    efeitoTransicao: data.efeito_transicao ?? defaultPlayerSettings.efeitoTransicao,
    volume: Number(data.volume ?? defaultPlayerSettings.volume),
    iniciarTelaCheia: data.iniciar_tela_cheia ?? defaultPlayerSettings.iniciarTelaCheia,
    modoEmergenciaAtivo:
      data.modo_emergencia_ativo ?? defaultPlayerSettings.modoEmergenciaAtivo,
    layoutEmergenciaId: data.layout_emergencia_id ?? undefined,
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

