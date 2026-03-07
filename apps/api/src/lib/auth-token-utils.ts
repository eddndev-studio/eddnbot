import { randomBytes, createHash } from "crypto";

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateAuthToken() {
  const random = randomBytes(32).toString("base64url");
  const rawToken = `ea_live_${random}`;
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export function generateRefreshToken() {
  const random = randomBytes(32).toString("base64url");
  const rawToken = `er_live_${random}`;
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export function generateVerifyToken(): string {
  return randomBytes(32).toString("base64url");
}
