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
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_#15315f,_#0b1120_55%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col p-4 md:p-6">
        <div className="mb-5 rounded-3xl border border-white/10 bg-white/8 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">
                Widget de Tempo
              </div>
              <div className="mt-1 text-3xl font-bold md:text-4xl">
                {data ? `${data.cidade}${data.estado ? `, ${data.estado}` : ""}` : `${cidade}, ${estado}`}
              </div>
              <div className="mt-2 text-sm text-sky-100/80">
                Previsão para os próximos {Math.max(1, Math.min(10, dias))} dias
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right text-sm text-sky-100/85">
              <div className="font-semibold">Atualização</div>
              <div>{atualizadoEm ? formatarAtualizacao(atualizadoEm) : "Aguardando dados"}</div>
            </div>
          </div>
        </div>

        {carregando && !data ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-lg text-sky-100/85">
            Carregando previsão do tempo...
          </div>
        ) : erro && !data ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-red-300/20 bg-red-500/10 p-8 text-center text-lg text-red-100">
            {erro}
          </div>
        ) : (
          <>
            {hoje && (
              <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_.8fr]">
                <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <WeatherIcon code={hoje.weatherCode} />
                    <div>
                      <div className="text-sm uppercase tracking-[0.24em] text-sky-200/70">
                        Hoje
                      </div>
                      <div className="mt-1 text-2xl font-bold md:text-3xl">{hoje.weatherLabel}</div>
                      <div className="mt-1 text-sm text-sky-100/80">{formatarDia(hoje.date)}</div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-end gap-5">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-sky-200/65">Máxima</div>
                      <div className="text-4xl font-bold">{Math.round(hoje.tempMax)}°</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-sky-200/65">Mínima</div>
                      <div className="text-3xl font-semibold text-sky-100/90">
                        {Math.round(hoje.tempMin)}°
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-sky-200/65">Chuva</div>
                      <div className="text-3xl font-semibold text-sky-100/90">
                        {hoje.precipitationProbabilityMax ?? 0}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
                  <div className="text-sm uppercase tracking-[0.24em] text-sky-200/70">Resumo</div>
                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-sky-100/85">
                    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                      <div className="font-semibold">Local</div>
                      <div>
                        {data?.cidade ?? cidade}
                        {data?.estado ? `, ${data.estado}` : estado ? `, ${estado}` : ""}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                      <div className="font-semibold">Fuso</div>
                      <div>{data?.timezone ?? "America/Sao_Paulo"}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                      <div className="font-semibold">Condição atual</div>
                      <div>{iconeClima(hoje.weatherCode)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {(data?.forecast ?? []).map((day) => (
                <div
                  key={day.date}
                  className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"
                >
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-200/75">
                    {formatarDia(day.date)}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <WeatherIcon code={day.weatherCode} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{day.weatherLabel}</div>
                      <div className="text-xs text-sky-100/75">
                        Chuva: {day.precipitationProbabilityMax ?? 0}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-sky-200/65">
                        Máx
                      </div>
                      <div className="text-2xl font-bold">{Math.round(day.tempMax)}°</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-sky-200/65">
                        Mín
                      </div>
                      <div className="text-xl font-semibold text-sky-100/90">
                        {Math.round(day.tempMin)}°
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {erro && data && (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                Exibindo a última previsão carregada. Detalhe: {erro}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
