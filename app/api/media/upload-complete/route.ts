import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { requireAdminSessionJson } from "@/lib/admin-auth";
import { getR2Bucket, getR2Client } from "@/lib/r2";
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

export async function POST(request: Request) {
  const unauthorized = await requireAdminSessionJson();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as {
    id?: string;
    nome?: string;
    tipo?: "video" | "imagem";
    mimeType?: string;
    tags?: string[];
    r2Key?: string;
    publicUrl?: string;
  };

  const id = String(body.id ?? "").trim();
  const nome = String(body.nome ?? "").trim();
  const tipo = body.tipo;
  const mimeType = String(body.mimeType ?? "").trim() || "application/octet-stream";
  const r2Key = String(body.r2Key ?? "").trim();
  const publicUrl = String(body.publicUrl ?? "").trim();
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((value): value is string => typeof value === "string")
    : [];

  if (!id || !nome || !r2Key || !publicUrl || (tipo !== "video" && tipo !== "imagem")) {
    return NextResponse.json({ erro: "Dados inválidos para concluir o upload." }, { status: 400 });
  }

  // #region debug-point D:direct-upload-complete-start
  void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "D", location: "app/api/media/upload-complete/route.ts:41", msg: "[DEBUG] direct upload completion started", data: { id, r2Key, nome, tipo }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  const head = await getR2Client()
    .send(
      new HeadObjectCommand({
        Bucket: getR2Bucket(),
        Key: r2Key,
      }),
    )
    .catch(() => null);

  if (!head) {
    return NextResponse.json(
      { erro: "O arquivo não foi encontrado no Cloudflare R2 após o envio." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("media")
    .insert({
      id,
      nome,
      tipo,
      mime_type: mimeType,
      tags,
      ativo: true,
      r2_key: r2Key,
      public_url: publicUrl,
    })
    .select("*")
    .single();

  if (error) {
    await getR2Client()
      .send(
        new DeleteObjectCommand({
          Bucket: getR2Bucket(),
          Key: r2Key,
        }),
      )
      .catch(() => null);

    // #region debug-point D:direct-upload-complete-fail
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "D", location: "app/api/media/upload-complete/route.ts:84", msg: "[DEBUG] direct upload completion failed to persist metadata", data: { id, r2Key, error: error.message }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const media = data as MediaRow;

  // #region debug-point D:direct-upload-complete-ok
  void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "D", location: "app/api/media/upload-complete/route.ts:92", msg: "[DEBUG] direct upload completion persisted metadata", data: { id: media.id, r2Key: media.r2_key }, ts: Date.now() }) }).catch(() => {});
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
