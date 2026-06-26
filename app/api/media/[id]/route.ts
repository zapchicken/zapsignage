import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { requireAdminSessionJson } from "@/lib/admin-auth";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type MediaRow = {
  id: string;
  mime_type: string | null;
  r2_key: string;
};

type Params = {
  params: Promise<{ id: string }>;
};

async function getMediaById(id: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("media").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data as MediaRow;
}

function toWebStream(body: unknown) {
  if (body && typeof body === "object" && "transformToWebStream" in body) {
    return (body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
  }
  return Readable.toWeb(body as Readable) as ReadableStream;
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const media = await getMediaById(id);
  if (!media) {
    return NextResponse.json({ erro: "Mídia não encontrada." }, { status: 404 });
  }

  const range = request.headers.get("range") ?? undefined;
  const object = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getR2Bucket(),
      Key: media.r2_key,
      Range: range,
    }),
  );

  const headers = new Headers();
  headers.set("Content-Type", media.mime_type ?? "application/octet-stream");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=300");
  if (typeof object.ContentLength === "number") {
    headers.set("Content-Length", String(object.ContentLength));
  }
  if (object.ETag) headers.set("ETag", object.ETag);
  if (object.ContentRange) headers.set("Content-Range", object.ContentRange);

  return new Response(toWebStream(object.Body), {
    status: range ? 206 : 200,
    headers,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const unauthorized = await requireAdminSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const media = await getMediaById(id);
  if (!media) {
    return NextResponse.json({ ok: true });
  }

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getR2Bucket(),
      Key: media.r2_key,
    }),
  );

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
