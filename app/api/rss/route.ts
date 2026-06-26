import { XMLParser } from "fast-xml-parser";
import { NextResponse } from "next/server";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function get(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function detectCharsetFromContentType(contentType: string | null) {
  if (!contentType) return null;
  const m = /charset=([^;]+)/i.exec(contentType);
  if (!m) return null;
  return m[1]?.trim().toLowerCase() ?? null;
}

function detectCharsetFromXmlProlog(xml: string) {
  const head = xml.slice(0, 256);
  const m = /<\?xml[^>]*encoding=["']([^"']+)["']/i.exec(head);
  if (!m) return null;
  return m[1]?.trim().toLowerCase() ?? null;
}

function decodeXml(buffer: ArrayBuffer, contentType: string | null) {
  const bytes = new Uint8Array(buffer);
  const charsetFromHeader = detectCharsetFromContentType(contentType);
  const tryDecode = (label: string) => {
    try {
      return new TextDecoder(label).decode(bytes);
    } catch {
      return null;
    }
  };

  const utf8 = tryDecode("utf-8") ?? "";
  const charsetFromProlog = detectCharsetFromXmlProlog(utf8);

  const candidates = [
    charsetFromHeader,
    charsetFromProlog,
    "utf-8",
    "iso-8859-1",
    "windows-1252",
  ].filter((c): c is string => Boolean(c));

  for (const c of candidates) {
    const decoded = tryDecode(c);
    if (decoded) return decoded;
  }
  return utf8;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const quantidade = Number(searchParams.get("quantidade") ?? "10");

  if (!url) {
    return NextResponse.json(
      { ok: false, erro: "Parâmetro 'url' é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "ZapChicken-DigitalSignage/1.0",
        accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, erro: `Falha ao buscar RSS (HTTP ${res.status}).` },
        { status: 400 },
      );
    }

    const buffer = await res.arrayBuffer();
    const xml = decodeXml(buffer, res.headers.get("content-type"));
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "text",
      removeNSPrefix: true,
    });
    const parsed = parser.parse(xml) as unknown;

    const rss = get(parsed, "rss");
    const rssChannel = get(rss, "channel");
    const rssItems = get(rssChannel, "item");

    const feed = get(parsed, "feed");
    const feedEntries = get(feed, "entry");

    const channel = get(parsed, "channel");
    const channelItems = get(channel, "item");

    const items = rssItems ?? feedEntries ?? channelItems ?? [];

    const asArray = Array.isArray(items) ? items : [items];
    const titulos = asArray
      .map((it: unknown) => {
        const title = isRecord(it) ? it.title : undefined;
        if (typeof title === "string") return title;
        const text = isRecord(title) ? title.text : undefined;
        if (typeof text === "string") return text;
        return null;
      })
      .filter((t): t is string => typeof t === "string" && Boolean(t.trim()))
      .slice(0, Number.isFinite(quantidade) ? Math.max(1, quantidade) : 10);

    return NextResponse.json({ ok: true, titulos });
  } catch {
    return NextResponse.json(
      { ok: false, erro: "Não foi possível buscar/interpretar o RSS." },
      { status: 400 },
    );
  }
}

