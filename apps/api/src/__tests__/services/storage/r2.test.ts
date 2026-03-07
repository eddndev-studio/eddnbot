import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();

function mockClass(type: string) {
  return vi.fn(function (this: Record<string, unknown>, input: Record<string, unknown>) {
    Object.assign(this, { _type: type, ...input });
  });
}

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(function (this: Record<string, unknown>) {
    this.send = mockSend;
  }),
  PutObjectCommand: mockClass("Put"),
  GetObjectCommand: mockClass("Get"),
  DeleteObjectCommand: mockClass("Delete"),
  HeadObjectCommand: mockClass("Head"),
}));

import { createR2Storage } from "../../../services/storage/r2";
import { S3Client } from "@aws-sdk/client-s3";

const config = {
  accountId: "test-account-id",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  bucket: "test-bucket",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createR2Storage", () => {
  it("creates S3Client with R2 endpoint", () => {
    createR2Storage(config);

    expect(S3Client).toHaveBeenCalledWith({
      region: "auto",
      endpoint: "https://test-account-id.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
      },
    });
  });

  describe("put", () => {
    it("sends PutObjectCommand with correct params", async () => {
      const storage = createR2Storage(config);
      mockSend.mockResolvedValueOnce({});

      await storage.put("tenant/media-id", Buffer.from("data"), "image/jpeg");

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "tenant/media-id",
          Body: Buffer.from("data"),
          ContentType: "image/jpeg",
        }),
      );
    });
  });

  describe("get", () => {
    it("returns buffer from GetObject response", async () => {
      const storage = createR2Storage(config);
      mockSend.mockResolvedValueOnce({
        Body: {
          transformToByteArray: async () => new Uint8Array([1, 2, 3]),
        },
      });

      const result = await storage.get("tenant/media-id");

      expect(result).toEqual(Buffer.from([1, 2, 3]));
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "tenant/media-id",
        }),
      );
    });

    it("returns null for NoSuchKey error", async () => {
      const storage = createR2Storage(config);
      const error = new Error("NoSuchKey");
      error.name = "NoSuchKey";
      mockSend.mockRejectedValueOnce(error);

      const result = await storage.get("nonexistent");
      expect(result).toBeNull();
    });

    it("throws for other errors", async () => {
      const storage = createR2Storage(config);
      mockSend.mockRejectedValueOnce(new Error("NetworkError"));

      await expect(storage.get("key")).rejects.toThrow("NetworkError");
    });
  });

  describe("delete", () => {
    it("sends DeleteObjectCommand", async () => {
      const storage = createR2Storage(config);
      mockSend.mockResolvedValueOnce({});

      await storage.delete("tenant/media-id");

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "tenant/media-id",
        }),
      );
    });
  });

  describe("exists", () => {
    it("returns true when HeadObject succeeds", async () => {
      const storage = createR2Storage(config);
      mockSend.mockResolvedValueOnce({});

      expect(await storage.exists("tenant/media-id")).toBe(true);
    });

    it("returns false for NotFound error", async () => {
      const storage = createR2Storage(config);
      const error = new Error("NotFound");
      error.name = "NotFound";
      mockSend.mockRejectedValueOnce(error);

      expect(await storage.exists("nonexistent")).toBe(false);
    });

    it("throws for other errors", async () => {
      const storage = createR2Storage(config);
      mockSend.mockRejectedValueOnce(new Error("AccessDenied"));

      await expect(storage.exists("key")).rejects.toThrow("AccessDenied");
    });
  });
});
