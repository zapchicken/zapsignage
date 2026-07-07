import { NextResponse } from "next/server";
import { requireAdminSessionJson } from "@/lib/admin-auth";
import { getR2StorageLimitBytes, getR2UsageBytes } from "@/lib/r2";

export async function GET() {
  const unauthorized = await requireAdminSessionJson();
  if (unauthorized) return unauthorized;

  try {
    const { totalBytes, totalObjects } = await getR2UsageBytes();
    const limitBytes = getR2StorageLimitBytes();
    const remainingBytes = Math.max(0, limitBytes - totalBytes);
    const usagePercent = limitBytes > 0 ? Math.min(100, (totalBytes / limitBytes) * 100) : 0;

    return NextResponse.json({
      provider: "cloudflare-r2",
      limitBytes,
      totalBytes,
      remainingBytes,
      totalObjects,
      usagePercent,
      limitSource: process.env.R2_STORAGE_LIMIT_BYTES ? "env" : "default-free-tier",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao consultar o uso do armazenamento.";
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
