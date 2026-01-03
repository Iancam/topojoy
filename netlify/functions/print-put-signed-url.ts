import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

const s3 = new S3Client({
  region: process.env.MY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

function getExtenson(filename: string, fallback = "png") {
  const parts = filename.split(".");
  return parts[parts.length - 1] || fallback;
}

export const handler = async (event: any) => {
  const { filename, contentType } = JSON.parse(event.body);
  const ext = getExtenson(filename);

  const date = new Date();
  const uniqueKey = `prints/${date.getFullYear()}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${String(date.getDate()).padStart(
    2,
    "0"
  )}/${date.getTime()}-${crypto.randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: uniqueKey,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 60 });

  return {
    statusCode: 200,
    body: JSON.stringify({ url, key: uniqueKey }),
  };
};
