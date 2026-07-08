import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// Backblaze B2 exposes an S3-compatible API, so we drive it with the AWS SDK.
// The bucket is PRIVATE — objects are never served directly; they are streamed
// through /api/avatar/[id] after an auth check.

const endpoint = process.env.B2_ENDPOINT;
const region = process.env.B2_REGION;
const accessKeyId = process.env.B2_KEY_ID;
const secretAccessKey = process.env.B2_APP_KEY;

export const B2_BUCKET = process.env.B2_BUCKET ?? "";

export function isStorageConfigured(): boolean {
  return Boolean(
    endpoint && region && accessKeyId && secretAccessKey && B2_BUCKET
  );
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error(
      "Armazenamento não configurado (variáveis B2_* em falta no ambiente)."
    );
  }
  if (!client) {
    client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }
  return client;
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getObject(
  key: string
): Promise<{ body: Uint8Array; contentType?: string }> {
  const res = await s3().send(
    new GetObjectCommand({ Bucket: B2_BUCKET, Key: key })
  );
  const body = await res.Body!.transformToByteArray();
  return { body, contentType: res.ContentType };
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }));
}
