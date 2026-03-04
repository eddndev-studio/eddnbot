import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey } from "../../lib/api-key-utils";

describe("hashApiKey", () => {
  it("returns a 64-char hex string (SHA-256)", () => {
    const hash = hashApiKey("ek_live_test123");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic", () => {
    const a = hashApiKey("ek_live_abc");
    const b = hashApiKey("ek_live_abc");
    expect(a).toBe(b);
  });

  it("produces different hashes for different keys", () => {
    const a = hashApiKey("ek_live_abc");
    const b = hashApiKey("ek_live_xyz");
    expect(a).not.toBe(b);
  });
});

describe("generateApiKey", () => {
  it("returns rawKey, keyHash, and keyPrefix", () => {
    const result = generateApiKey();
    expect(result).toHaveProperty("rawKey");
    expect(result).toHaveProperty("keyHash");
    expect(result).toHaveProperty("keyPrefix");
  });

  it("rawKey starts with ek_live_", () => {
    const { rawKey } = generateApiKey();
    expect(rawKey).toMatch(/^ek_live_/);
  });

  it("keyPrefix is the first 12 chars of rawKey", () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(keyPrefix).toBe(rawKey.slice(0, 12));
  });

  it("keyHash matches hashing the rawKey", () => {
    const { rawKey, keyHash } = generateApiKey();
    expect(keyHash).toBe(hashApiKey(rawKey));
  });

  it("generates unique keys", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.rawKey).not.toBe(b.rawKey);
    expect(a.keyHash).not.toBe(b.keyHash);
  });
});
