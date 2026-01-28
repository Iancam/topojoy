import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.MY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

function getExtension(filename?: string | null, fallback = "png") {
  if (!filename) return fallback;
  const parts = filename.split(".");
  const ext = parts[parts.length - 1];
  return ext || fallback;
}

export const handler = async (event: any) => {
  const { filename, mapConfigId } = JSON.parse(event.body || "{}");

  // Derive a safe extension from the filename, defaulting to png
  const ext = "png";

  // If contentType is not provided, assume PNG (what the frontend currently sends)
  const finalContentType = "image/png";

  const uniqueKey = `maps/${mapConfigId}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: uniqueKey,
    ContentType: finalContentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 60 });

  return {
    statusCode: 200,
    body: JSON.stringify({ url, key: uniqueKey }),
  };
};
