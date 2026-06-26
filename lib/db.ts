import type { PlayerSettings } from "@/lib/types";

export const defaultPlayerSettings: PlayerSettings = {
  resolucao: "1920x1080",
  efeitoTransicao: "fade",
  volume: 0.8,
  iniciarTelaCheia: true,
  modoEmergenciaAtivo: false,
};

export async function getPlayerSettings(): Promise<PlayerSettings> {
  const response = await fetch("/api/admin", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    return defaultPlayerSettings;
  };
  const data = (await response.json()) as { player?: PlayerSettings };
  return data.player ?? defaultPlayerSettings;
}

export async function setPlayerSettings(value: PlayerSettings) {
  const response = await fetch("/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "setPlayerSettings",
      payload: value,
    }),
  });
  if (!response.ok) {
    let erro = "Falha ao salvar as configurações do player.";
    try {
      const data = (await response.json()) as { erro?: string };
      erro = data.erro ?? erro;
    } catch {}
    throw new Error(erro);
  }
}

