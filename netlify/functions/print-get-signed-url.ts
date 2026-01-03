import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
const s3 = new S3Client({
  region: process.env.MY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

export const handler = async (event: any) => {
  const { filename } = JSON.parse(event.body);

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: filename,
  });

  const fiveDays = 60 * 60 * 24 * 5;

  const url = await getSignedUrl(s3, command, { expiresIn: fiveDays });

  return {
    statusCode: 200,
    body: JSON.stringify({ url }),
  };
};
