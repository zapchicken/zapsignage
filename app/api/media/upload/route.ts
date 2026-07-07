import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { requireAdminSessionJson } from "@/lib/admin-auth";
import { getR2Bucket, getR2Client, getR2StorageLimitBytes, getR2UsageBytes } from "@/lib/r2";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type MediaRow = {
  id: string;
  nome: string;
  tipo: "video" | "imagem";
  mime_type: string | null;
  tags: string[] | null;
  ativo: boolean;
  r2_key: string;
  public_url: string;
  created_at: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSessionJson();
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const file = form.get("file");
  const nome = String(form.get("nome") ?? "").trim();
  const tagsRaw = String(form.get("tags") ?? "[]");
  const mimeType = String(form.get("mimeType") ?? "");
  const tipo = String(form.get("tipo") ?? "") as "video" | "imagem";

  if (!(file instanceof File) || !nome || (tipo !== "video" && tipo !== "imagem")) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  // #region debug-point A:upload-input
  void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "A", location: "app/api/media/upload/route.ts:37", msg: "[DEBUG] media upload input accepted", data: { nome, tipo, mimeType, fileName: file.name, fileSize: file.size }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  const id = crypto.randomUUID();
  const safeName = sanitizeFileName(file.name || `${id}`);
  const prefix = tipo === "video" ? "videos" : "imagens";
  const r2Key = `${prefix}/${id}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileSize = buffer.byteLength;
  const limitBytes = getR2StorageLimitBytes();
  const { totalBytes } = await getR2UsageBytes().catch((error) => {
    // #region debug-point B:usage-error
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "B", location: "app/api/media/upload/route.ts:47", msg: "[DEBUG] media usage lookup failed before upload", data: { error: error instanceof Error ? error.message : String(error) }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw error;
  });

  // #region debug-point A:usage-state
  void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "A", location: "app/api/media/upload/route.ts:54", msg: "[DEBUG] media usage state resolved", data: { totalBytes, limitBytes, fileSize, projectedBytes: totalBytes + fileSize }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  if (totalBytes + fileSize > limitBytes) {
    const remainingBytes = Math.max(0, limitBytes - totalBytes);
    // #region debug-point A:limit-block
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "A", location: "app/api/media/upload/route.ts:59", msg: "[DEBUG] media upload blocked by storage limit", data: { remainingBytes, fileSize, totalBytes, limitBytes }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return NextResponse.json(
      {
        erro:
          remainingBytes > 0
            ? `Upload bloqueado: restam ${remainingBytes} bytes antes do limite configurado do R2.`
            : "Upload bloqueado: o limite configurado do R2 foi atingido.",
      },
      { status: 400 },
    );
  }

  const bucket = getR2Bucket();

  // #region debug-point C:r2-put-start
  void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "C", location: "app/api/media/upload/route.ts:72", msg: "[DEBUG] starting r2 put object", data: { bucket, r2Key, contentType: mimeType || file.type || "application/octet-stream", fileSize }, ts: Date.now() }) }).catch(() => {});
  // #endregion
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      Body: buffer,
      ContentType: mimeType || file.type || "application/octet-stream",
    }),
  ).catch((error) => {
    // #region debug-point C:r2-put-error
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "C", location: "app/api/media/upload/route.ts:80", msg: "[DEBUG] r2 put object failed", data: { bucket, r2Key, error: error instanceof Error ? error.message : String(error) }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw error;
  });
  // #region debug-point C:r2-put-ok
  void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "C", location: "app/api/media/upload/route.ts:84", msg: "[DEBUG] r2 put object succeeded", data: { bucket, r2Key }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  const supabase = getSupabaseServerClient();
  const publicUrl = `/api/media/${id}`;
  const tags = (() => {
    try {
      const parsed = JSON.parse(tagsRaw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  })();

  const { data, error } = await supabase
    .from("media")
    .insert({
      id,
      nome,
      tipo,
      mime_type: mimeType || file.type || "application/octet-stream",
      tags,
      ativo: true,
      r2_key: r2Key,
      public_url: publicUrl,
    })
    .select("*")
    .single();

  if (error) {
    // #region debug-point D:supabase-insert-error
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "D", location: "app/api/media/upload/route.ts:113", msg: "[DEBUG] media metadata insert failed", data: { id, r2Key, error: error.message }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const media = data as MediaRow;

  // #region debug-point D:supabase-insert-ok
  void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "D", location: "app/api/media/upload/route.ts:121", msg: "[DEBUG] media metadata insert succeeded", data: { id: media.id, r2Key: media.r2_key }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  return NextResponse.json({
    id: media.id,
    nome: media.nome,
    tipo: media.tipo,
    mimeType: media.mime_type,
    tags: media.tags ?? [],
    ativo: media.ativo,
    r2Key: media.r2_key,
    publicUrl: media.public_url,
    createdAt: new Date(media.created_at).getTime(),
  });
}
