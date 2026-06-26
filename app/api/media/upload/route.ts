import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
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

  return NextResponse.json({
    id: data.id,
    nome: data.nome,
    tipo: data.tipo,
    mimeType: data.mime_type,
    tags: data.tags ?? [],
    ativo: data.ativo,
    r2Key: data.r2_key,
    publicUrl: data.public_url,
    createdAt: new Date(data.created_at).getTime(),
  });
}
