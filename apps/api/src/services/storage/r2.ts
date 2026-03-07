import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import type { StorageAdapter } from "./types";

export interface R2StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function createR2Storage(config: R2StorageConfig): StorageAdapter {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async put(key, data, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: data,
          ContentType: contentType,
        }),
      );
    },

    async get(key) {
      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }),
        );
        return Buffer.from(await response.Body!.transformToByteArray());
      } catch (err) {
        if ((err as { name?: string }).name === "NoSuchKey") return null;
        throw err;
      }
    },

    async delete(key) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }),
      );
    },

    async exists(key) {
      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }),
        );
        return true;
      } catch (err) {
        if ((err as { name?: string }).name === "NotFound") return false;
        throw err;
      }
    },
  };
}
