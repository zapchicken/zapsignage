import type { LayoutTimelineItem, PlayerSettings, ScheduleItem } from "@/lib/types";

export function escolherLayoutAtivo(input: {
  agora: Date;
  settings: PlayerSettings;
  timelineGlobal: LayoutTimelineItem[];
  agendamentos: ScheduleItem[];
}) {
  if (input.settings.modoEmergenciaAtivo && input.settings.layoutEmergenciaId) {
    return { layoutId: input.settings.layoutEmergenciaId, origem: "emergencia" as const };
  }

  const hoje = input.agora.toISOString().slice(0, 10);
  const ativos = input.agendamentos
    .filter((a) => a.dataInicio <= hoje && hoje <= a.dataFim)
    .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));

  if (ativos.length) {
    return { layoutId: ativos[0].layoutId, origem: "agendamento" as const };
  }

  const items = input.timelineGlobal
    .slice()
    .filter((i) => i.duracao > 0)
    .sort((a, b) => a.ordem - b.ordem);

  const total = items.reduce((acc, it) => acc + it.duracao, 0);
  if (!items.length || total <= 0) {
    return { layoutId: null, origem: "vazio" as const };
  }

  const t = Math.floor(input.agora.getTime() / 1000);
  const pos = t % total;
  let acc = 0;
  for (const it of items) {
    acc += it.duracao;
    if (pos < acc) return { layoutId: it.layoutId, origem: "timelineGlobal" as const };
  }
  return { layoutId: items[0].layoutId, origem: "timelineGlobal" as const };
}

