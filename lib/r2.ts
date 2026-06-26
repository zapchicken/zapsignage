import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

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
