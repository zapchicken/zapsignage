import { NextResponse } from "next/server";

type GeocodingResult = {
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
  timezone?: string;
};

type ForecastDay = {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitationProbabilityMax: number | null;
  weatherCode: number;
  weatherLabel: string;
};

const weatherCodeLabels: Record<number, string> = {
  0: "Céu limpo",
  1: "Predominantemente limpo",
  2: "Parcialmente nublado",
  3: "Encoberto",
  45: "Nevoeiro",
  48: "Nevoeiro com geada",
  51: "Garoa fraca",
  53: "Garoa moderada",
  55: "Garoa intensa",
  56: "Garoa congelante fraca",
  57: "Garoa congelante intensa",
  61: "Chuva fraca",
  63: "Chuva moderada",
  65: "Chuva forte",
  66: "Chuva congelante fraca",
  67: "Chuva congelante forte",
  71: "Neve fraca",
  73: "Neve moderada",
  75: "Neve forte",
  77: "Grãos de neve",
  80: "Pancadas de chuva fracas",
  81: "Pancadas de chuva moderadas",
  82: "Pancadas de chuva fortes",
  85: "Pancadas de neve fracas",
  86: "Pancadas de neve fortes",
  95: "Trovoadas",
  96: "Trovoadas com granizo fraco",
  99: "Trovoadas com granizo forte",
};

function clampDays(value: string | null) {
  const days = Number(value ?? "10");
  if (!Number.isFinite(days)) return 10;
  return Math.max(1, Math.min(10, Math.round(days)));
}

function weatherLabelFromCode(code: number) {
  return weatherCodeLabels[code] ?? "Condição indisponível";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cidade = (searchParams.get("cidade") ?? "Jaguariuna").trim();
  const estado = (searchParams.get("estado") ?? "SP").trim();
  const pais = (searchParams.get("pais") ?? "BR").trim().toUpperCase();
  const dias = clampDays(searchParams.get("dias"));

  if (!cidade) {
    return NextResponse.json({ erro: "Informe a cidade." }, { status: 400 });
  }

  try {
    const busca = [cidade, estado].filter(Boolean).join(", ");
    const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodingUrl.searchParams.set("name", busca);
    geocodingUrl.searchParams.set("count", "10");
    geocodingUrl.searchParams.set("language", "pt");
    geocodingUrl.searchParams.set("format", "json");
    if (pais) geocodingUrl.searchParams.set("countryCode", pais);

    const geocodingRes = await fetch(geocodingUrl, {
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!geocodingRes.ok) {
      throw new Error("Falha ao localizar a cidade.");
    }

    const geocodingData = (await geocodingRes.json()) as { results?: GeocodingResult[] };
    const location =
      geocodingData.results?.find((item) =>
        estado ? item.admin1?.toLowerCase().includes(estado.toLowerCase()) : true,
      ) ??
      geocodingData.results?.[0];

    if (!location) {
      return NextResponse.json(
        { erro: "Cidade não encontrada para consulta do clima." },
        { status: 404 },
      );
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(location.latitude));
    forecastUrl.searchParams.set("longitude", String(location.longitude));
    forecastUrl.searchParams.set(
      "daily",
      [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
      ].join(","),
    );
    forecastUrl.searchParams.set("forecast_days", String(dias));
    forecastUrl.searchParams.set("timezone", location.timezone ?? "America/Sao_Paulo");

    const forecastRes = await fetch(forecastUrl, {
      next: { revalidate: 60 * 30 },
    });
    if (!forecastRes.ok) {
      throw new Error("Falha ao buscar a previsão do tempo.");
    }

    const forecastData = (await forecastRes.json()) as {
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: Array<number | null>;
        weather_code?: number[];
      };
    };

    const daily = forecastData.daily;
    if (
      !daily?.time ||
      !daily.temperature_2m_max ||
      !daily.temperature_2m_min ||
      !daily.weather_code
    ) {
      throw new Error("Resposta de clima incompleta.");
    }

    const forecast: ForecastDay[] = daily.time.map((date, index) => {
      const weatherCode = daily.weather_code?.[index] ?? 0;
      return {
        date,
        tempMin: Number(daily.temperature_2m_min?.[index] ?? 0),
        tempMax: Number(daily.temperature_2m_max?.[index] ?? 0),
        precipitationProbabilityMax:
          daily.precipitation_probability_max?.[index] ?? null,
        weatherCode,
        weatherLabel: weatherLabelFromCode(weatherCode),
      };
    });

    return NextResponse.json(
      {
        cidade: location.name,
        estado: location.admin1 ?? estado,
        pais: location.country_code ?? pais,
        timezone: location.timezone ?? "America/Sao_Paulo",
        latitude: location.latitude,
        longitude: location.longitude,
        forecast,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao carregar a previsão do tempo.";
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
