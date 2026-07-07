import { WeatherWidget } from "@/components/widgets/WeatherWidget";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickParam(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default async function TempoWidgetPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const cidade = pickParam(params.cidade, "Jaguariuna");
  const estado = pickParam(params.estado, "SP");
  const pais = pickParam(params.pais, "BR");
  const dias = Number(pickParam(params.dias, "10"));

  return (
    <WeatherWidget
      cidadeInicial={cidade}
      estadoInicial={estado}
      paisInicial={pais}
      dias={Number.isFinite(dias) ? dias : 10}
    />
  );
}
