import "server-only";

import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;
const DEFAULT_R2_STORAGE_LIMIT_BYTES = 10_000_000_000;

export function getR2Client() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return client;
}

export function getR2Bucket() {
  return process.env.R2_BUCKET ?? "";
}

export function getR2StorageLimitBytes() {
  const raw = process.env.R2_STORAGE_LIMIT_BYTES?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return DEFAULT_R2_STORAGE_LIMIT_BYTES;
}

export async function getR2UsageBytes() {
  let continuationToken: string | undefined;
  let totalBytes = 0;
  let totalObjects = 0;

  do {
    const response = await getR2Client().send(
      new ListObjectsV2Command({
        Bucket: getR2Bucket(),
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      totalBytes += object.Size ?? 0;
      totalObjects += 1;
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return { totalBytes, totalObjects };
}
