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

    // #region debug-point C:direct-upload-start
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "C", location: "app/api/media/upload-url/route.ts:31", msg: "[DEBUG] direct upload url requested", data: { fileName, mimeType, tipo, fileSize }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    const limitBytes = getR2StorageLimitBytes();
    // #region debug-point C:usage-check-start
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "C", location: "app/api/media/upload-url/route.ts:36", msg: "[DEBUG] direct upload usage lookup started", data: {}, ts: Date.now() }) }).catch(() => {});
    // #endregion
    const { totalBytes } = await getR2UsageBytes();
    // #region debug-point C:usage-check-ok
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "C", location: "app/api/media/upload-url/route.ts:40", msg: "[DEBUG] direct upload usage lookup succeeded", data: { totalBytes, limitBytes, fileSize }, ts: Date.now() }) }).catch(() => {});
    // #endregion
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

    // #region debug-point C:cors-start
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "C", location: "app/api/media/upload-url/route.ts:56", msg: "[DEBUG] direct upload cors sync started", data: { origin, corsOrigins }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    try {
      await ensureR2CorsOrigins(corsOrigins);
      // #region debug-point C:cors-ok
      void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "C", location: "app/api/media/upload-url/route.ts:61", msg: "[DEBUG] direct upload cors sync succeeded", data: { origin }, ts: Date.now() }) }).catch(() => {});
      // #endregion
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // #region debug-point C:cors-warn
      void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "C", location: "app/api/media/upload-url/route.ts:66", msg: "[DEBUG] direct upload cors sync skipped", data: { origin, error: message }, ts: Date.now() }) }).catch(() => {});
      // #endregion
    }

    // #region debug-point C:signed-url-start
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "C", location: "app/api/media/upload-url/route.ts:64", msg: "[DEBUG] direct upload signed url generation started", data: { r2Key, mimeType }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    const uploadUrl = await getR2SignedUploadUrl({
      key: r2Key,
      contentType: mimeType,
    });

    // #region debug-point C:direct-upload-url-ok
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "C", location: "app/api/media/upload-url/route.ts:71", msg: "[DEBUG] direct upload url generated", data: { r2Key, origin }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    return NextResponse.json({
      id,
      r2Key,
      uploadUrl,
      publicUrl: `/api/media/${id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // #region debug-point C:direct-upload-fail
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "C", location: "app/api/media/upload-url/route.ts:82", msg: "[DEBUG] direct upload url generation failed", data: { error: message }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
