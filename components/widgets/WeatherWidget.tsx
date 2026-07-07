"use client";

import { useEffect, useMemo, useState } from "react";

type ForecastDay = {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitationProbabilityMax: number | null;
  weatherCode: number;
  weatherLabel: string;
};

type WeatherPayload = {
  cidade: string;
  estado: string;
  pais: string;
  timezone: string;
  latitude: number;
  longitude: number;
  forecast: ForecastDay[];
};

function formatarDia(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${date}T12:00:00`));
}

function formatarAtualizacao(now: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(now);
}

function iconeClima(code: number) {
  if (code === 0) return "Sol";
  if ([1, 2].includes(code)) return "Sol e nuvens";
  if ([3, 45, 48].includes(code)) return "Nublado";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Chuva";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Neve";
  if ([95, 96, 99].includes(code)) return "Tempestade";
  return "Clima";
}

function WeatherIcon({ code }: { code: number }) {
  if (code === 0) {
    return (
      <div className="relative h-12 w-12 rounded-full bg-amber-400 shadow-[0_0_40px_rgba(251,191,36,.35)]">
        <div className="absolute inset-[-8px] rounded-full border border-amber-200/40" />
      </div>
    );
  }

  if ([1, 2].includes(code)) {
    return (
      <div className="relative h-12 w-12">
        <div className="absolute left-1 top-0 h-7 w-7 rounded-full bg-amber-400" />
        <div className="absolute bottom-1 right-0 h-6 w-9 rounded-full bg-sky-100" />
        <div className="absolute bottom-3 right-4 h-5 w-6 rounded-full bg-sky-100" />
      </div>
    );
  }

  if ([3, 45, 48].includes(code)) {
    return (
      <div className="relative h-12 w-12">
        <div className="absolute bottom-1 left-1 h-6 w-10 rounded-full bg-slate-300" />
        <div className="absolute bottom-4 left-3 h-5 w-6 rounded-full bg-slate-300" />
      </div>
    );
  }

  if ([95, 96, 99].includes(code)) {
    return (
      <div className="relative h-12 w-12">
        <div className="absolute bottom-2 left-1 h-6 w-10 rounded-full bg-slate-300" />
        <div className="absolute bottom-5 left-3 h-5 w-6 rounded-full bg-slate-300" />
        <div className="absolute bottom-0 left-5 h-5 w-3 skew-x-[-20deg] bg-amber-300" />
      </div>
    );
  }

  return (
    <div className="relative h-12 w-12">
      <div className="absolute bottom-3 left-1 h-6 w-10 rounded-full bg-slate-300" />
      <div className="absolute bottom-0 left-3 flex gap-1">
        <span className="h-3 w-1 rounded-full bg-sky-300" />
        <span className="h-4 w-1 rounded-full bg-sky-300" />
        <span className="h-3 w-1 rounded-full bg-sky-300" />
      </div>
    </div>
  );
}

export function WeatherWidget({
  cidadeInicial,
  estadoInicial,
  paisInicial,
  dias = 10,
}: {
  cidadeInicial: string;
  estadoInicial: string;
  paisInicial: string;
  dias?: number;
}) {
  const [data, setData] = useState<WeatherPayload | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  const cidade = cidadeInicial.trim() || "Jaguariuna";
  const estado = estadoInicial.trim() || "SP";
  const pais = paisInicial.trim() || "BR";

  useEffect(() => {
    let active = true;

    const carregar = async () => {
      setCarregando(true);
      setErro("");
      try {
        const params = new URLSearchParams({
          cidade,
          estado,
          pais,
          dias: String(Math.max(1, Math.min(10, dias))),
        });
        const res = await fetch(`/api/weather?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as WeatherPayload & { erro?: string };
        if (!res.ok) {
          throw new Error(json.erro ?? "Falha ao carregar o clima.");
        }
        if (!active) return;
        setData(json);
        setAtualizadoEm(new Date());
      } catch (error) {
        if (!active) return;
        setErro(error instanceof Error ? error.message : "Falha ao carregar o clima.");
      } finally {
        if (active) setCarregando(false);
      }
    };

    void carregar();
    const timer = window.setInterval(carregar, 30 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [cidade, estado, pais, dias]);

  const hoje = useMemo(() => data?.forecast?.[0] ?? null, [data]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fb923c_0%,_#f59e0b_28%,_#2a1708_58%,_#111827_100%)] text-white">
      <div className="flex h-full w-full flex-col gap-4 p-3 md:gap-5 md:p-5">
        <div className="rounded-[28px] border border-amber-300/20 bg-[linear-gradient(135deg,rgba(17,24,39,0.9),rgba(52,31,12,0.88))] px-6 py-5 shadow-[0_20px_80px_rgba(17,24,39,0.35)] backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/85">
                Widget de Tempo
              </div>
              <div className="mt-1 text-4xl font-bold leading-none md:text-5xl xl:text-6xl">
                {data ? `${data.cidade}${data.estado ? `, ${data.estado}` : ""}` : `${cidade}, ${estado}`}
              </div>
              <div className="mt-3 text-base text-amber-50/85 md:text-lg">
                Previsão para os próximos {Math.max(1, Math.min(10, dias))} dias
              </div>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-black/25 px-5 py-4 text-right text-sm text-amber-50/90 md:min-w-48 md:text-base">
              <div className="font-semibold">Atualização</div>
              <div>{atualizadoEm ? formatarAtualizacao(atualizadoEm) : "Aguardando dados"}</div>
            </div>
          </div>
        </div>

        {carregando && !data ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-amber-300/15 bg-black/20 text-lg text-amber-50/90">
            Carregando previsão do tempo...
          </div>
        ) : erro && !data ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-red-300/20 bg-red-500/10 p-8 text-center text-lg text-red-100">
            {erro}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-5">
            {hoje && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_.85fr]">
                <div className="rounded-[28px] border border-amber-300/15 bg-[linear-gradient(180deg,rgba(17,24,39,0.86),rgba(36,23,10,0.88))] p-6 shadow-[0_12px_40px_rgba(17,24,39,0.28)] backdrop-blur-sm xl:min-h-72">
                  <div className="flex items-center gap-4">
                    <div className="scale-125 md:scale-150">
                      <WeatherIcon code={hoje.weatherCode} />
                    </div>
                    <div>
                      <div className="text-sm uppercase tracking-[0.24em] text-amber-200/75">
                        Hoje
                      </div>
                      <div className="mt-2 text-3xl font-bold leading-tight md:text-4xl xl:text-5xl">
                        {hoje.weatherLabel}
                      </div>
                      <div className="mt-2 text-base text-amber-50/80 md:text-lg">
                        {formatarDia(hoje.date)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-amber-200/70">Máxima</div>
                      <div className="text-5xl font-bold leading-none text-amber-300 md:text-6xl">
                        {Math.round(hoje.tempMax)}°
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-amber-200/70">Mínima</div>
                      <div className="text-4xl font-semibold leading-none text-amber-50/95 md:text-5xl">
                        {Math.round(hoje.tempMin)}°
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-amber-200/70">Chuva</div>
                      <div className="text-4xl font-semibold leading-none text-amber-50/95 md:text-5xl">
                        {hoje.precipitationProbabilityMax ?? 0}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-amber-300/15 bg-[linear-gradient(180deg,rgba(17,24,39,0.86),rgba(36,23,10,0.88))] p-6 shadow-[0_12px_40px_rgba(17,24,39,0.28)] backdrop-blur-sm xl:min-h-72">
                  <div className="text-sm uppercase tracking-[0.24em] text-amber-200/75 md:text-base">
                    Resumo
                  </div>
                  <div className="mt-4 grid h-[calc(100%-2rem)] grid-cols-1 gap-4 text-base text-amber-50/90">
                    <div className="rounded-2xl border border-amber-300/15 bg-black/20 px-5 py-4">
                      <div className="font-semibold">Local</div>
                      <div className="mt-1 text-lg">
                        {data?.cidade ?? cidade}
                        {data?.estado ? `, ${data.estado}` : estado ? `, ${estado}` : ""}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-300/15 bg-black/20 px-5 py-4">
                      <div className="font-semibold">Fuso</div>
                      <div className="mt-1 text-lg">{data?.timezone ?? "America/Sao_Paulo"}</div>
                    </div>
                    <div className="rounded-2xl border border-amber-300/15 bg-black/20 px-5 py-4">
                      <div className="font-semibold">Condição atual</div>
                      <div className="mt-1 text-lg">{iconeClima(hoje.weatherCode)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {(data?.forecast ?? []).map((day) => (
                <div
                  key={day.date}
                  className="flex h-full flex-col rounded-[24px] border border-amber-300/15 bg-[linear-gradient(180deg,rgba(17,24,39,0.84),rgba(45,27,11,0.84))] p-4 shadow-[0_10px_28px_rgba(17,24,39,0.22)] backdrop-blur-sm md:p-5"
                >
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200/75 md:text-base">
                    {formatarDia(day.date)}
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="scale-110 md:scale-125">
                      <WeatherIcon code={day.weatherCode} />
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-base font-semibold leading-tight md:text-lg">
                        {day.weatherLabel}
                      </div>
                      <div className="mt-1 text-sm text-amber-50/75 md:text-base">
                        Chuva: {day.precipitationProbabilityMax ?? 0}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-5">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-amber-200/70">
                        Máx
                      </div>
                      <div className="text-3xl font-bold leading-none text-amber-300 md:text-4xl">
                        {Math.round(day.tempMax)}°
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-amber-200/70">
                        Mín
                      </div>
                      <div className="text-2xl font-semibold leading-none text-amber-50/95 md:text-3xl">
                        {Math.round(day.tempMin)}°
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {erro && data && (
              <div className="mt-4 rounded-2xl border border-amber-300/30 bg-[rgba(251,146,60,0.14)] px-4 py-3 text-sm text-amber-50">
                Exibindo a última previsão carregada. Detalhe: {erro}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
