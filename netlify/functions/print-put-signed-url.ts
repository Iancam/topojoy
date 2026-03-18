import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAWSKey, putAWSImage } from "../lib/aws";

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

  if (!mapConfigId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "mapConfigId is required" }),
    };
  }

  const url = await putAWSImage(mapConfigId, s3);

  return {
    statusCode: 200,
    body: JSON.stringify({ url, key: getAWSKey(mapConfigId) }),
  };
};
