import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getAWSKey(mapConfigId: string) {
  return `maps/${mapConfigId}.png`;
}

export async function putAWSImage(mapConfigId: string, s3: S3Client) {
  const finalContentType = "image/png";

  const uniqueKey = getAWSKey(mapConfigId);

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: uniqueKey,
    ContentType: finalContentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 60 });

  return url;
}
