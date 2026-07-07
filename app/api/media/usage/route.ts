import { NextResponse } from "next/server";
import { requireAdminSessionJson } from "@/lib/admin-auth";
import { getR2StorageLimitBytes, getR2UsageBytes } from "@/lib/r2";

export async function GET() {
  const unauthorized = await requireAdminSessionJson();
  if (unauthorized) return unauthorized;

  try {
    // #region debug-point B:usage-start
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "B", location: "app/api/media/usage/route.ts:9", msg: "[DEBUG] media usage request started", data: {}, ts: Date.now() }) }).catch(() => {});
    // #endregion
    const { totalBytes, totalObjects } = await getR2UsageBytes();
    const limitBytes = getR2StorageLimitBytes();
    const remainingBytes = Math.max(0, limitBytes - totalBytes);
    const usagePercent = limitBytes > 0 ? Math.min(100, (totalBytes / limitBytes) * 100) : 0;
    const platformUploadLimitBytes = process.env.VERCEL ? 4_500_000 : null;
    const platformUploadLimitSource = process.env.VERCEL ? "vercel-function-body-limit" : "local-server";
    const directUploadEnabled = true;

    // #region debug-point B:usage-ok
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "post-fix", hypothesisId: "B", location: "app/api/media/usage/route.ts:19", msg: "[DEBUG] media usage request succeeded with platform upload limit", data: { totalBytes, totalObjects, limitBytes, remainingBytes, usagePercent, platformUploadLimitBytes, platformUploadLimitSource, directUploadEnabled }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    return NextResponse.json({
      provider: "cloudflare-r2",
      limitBytes,
      totalBytes,
      remainingBytes,
      totalObjects,
      usagePercent,
      limitSource: process.env.R2_STORAGE_LIMIT_BYTES ? "env" : "default-free-tier",
      platformUploadLimitBytes,
      platformUploadLimitSource,
      directUploadEnabled,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao consultar o uso do armazenamento.";
    // #region debug-point B:usage-fail
    void fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "media-upload-error", runId: "pre-fix", hypothesisId: "B", location: "app/api/media/usage/route.ts:28", msg: "[DEBUG] media usage request failed", data: { error: message }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
