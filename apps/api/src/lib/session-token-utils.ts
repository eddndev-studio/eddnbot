import { randomBytes, createHash } from "crypto";

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateSessionToken() {
  const random = randomBytes(32).toString("base64url");
  const rawToken = `es_live_${random}`;
  const tokenHash = hashSessionToken(rawToken);
  return { rawToken, tokenHash };
}
