import { PutObjectCommand } from "@aws-sdk/client-s3";
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

  const id = crypto.randomUUID();
  const safeName = sanitizeFileName(file.name || `${id}`);
  const prefix = tipo === "video" ? "videos" : "imagens";
  const r2Key = `${prefix}/${id}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = getR2Bucket();

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      Body: buffer,
      ContentType: mimeType || file.type || "application/octet-stream",
    }),
  );

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
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const media = data as MediaRow;

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
