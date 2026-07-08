import { NextResponse } from "next/server";
import { requireAdminSessionJson } from "@/lib/admin-auth";
import {
  ensureR2CorsOrigins,
  getR2SignedUploadUrl,
  getR2StorageLimitBytes,
  getR2UsageBytes,
} from "@/lib/r2";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSessionJson();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      fileName?: string;
      mimeType?: string;
      tipo?: "video" | "imagem";
      fileSize?: number;
    };

    const fileName = String(body.fileName ?? "").trim();
    const mimeType = String(body.mimeType ?? "").trim() || "application/octet-stream";
    const tipo = body.tipo;
    const fileSize = Number(body.fileSize ?? 0);

    if (!fileName || (tipo !== "video" && tipo !== "imagem") || !Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ erro: "Dados inválidos para gerar o upload." }, { status: 400 });
    }

    const limitBytes = getR2StorageLimitBytes();
    const { totalBytes } = await getR2UsageBytes();
    if (totalBytes + fileSize > limitBytes) {
      return NextResponse.json(
        {
          erro: "Upload bloqueado: o arquivo excede o limite de armazenamento configurado do R2.",
        },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const safeName = sanitizeFileName(fileName || `${id}`);
    const prefix = tipo === "video" ? "videos" : "imagens";
    const r2Key = `${prefix}/${id}-${safeName}`;
    const origin = request.headers.get("origin");
    const corsOrigins = [origin, process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000", "http://localhost:3001"].filter(
      (value): value is string => Boolean(value),
    );

    try {
      await ensureR2CorsOrigins(corsOrigins);
    } catch {
      // Ignore CORS sync failures here. The bucket policy can be configured manually.
    }

    const uploadUrl = await getR2SignedUploadUrl({
      key: r2Key,
      contentType: mimeType,
    });

    return NextResponse.json({
      id,
      r2Key,
      uploadUrl,
      publicUrl: `/api/media/${id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
