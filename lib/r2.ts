import "server-only";

import {
  GetBucketCorsCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export async function getR2SignedUploadUrl(input: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  return getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: input.key,
      ContentType: input.contentType,
    }),
    { expiresIn: input.expiresIn ?? 300 },
  );
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

export async function ensureR2CorsOrigins(origins: string[]) {
  const bucket = getR2Bucket();
  const normalizedOrigins = Array.from(
    new Set(
      origins
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  );

  if (!bucket || normalizedOrigins.length === 0) return;

  const existing = await getR2Client()
    .send(new GetBucketCorsCommand({ Bucket: bucket }))
    .catch(() => null);

  const currentRules = existing?.CORSRules ?? [];
  const currentOrigins = new Set(
    currentRules.flatMap((rule) => rule.AllowedOrigins ?? []).filter(Boolean),
  );

  const hasAllOrigins = normalizedOrigins.every((origin) => currentOrigins.has(origin));
  if (hasAllOrigins) return;

  const mergedOrigins = Array.from(new Set([...currentOrigins, ...normalizedOrigins]));

  await getR2Client().send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "HEAD", "PUT"],
            AllowedOrigins: mergedOrigins,
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
}
