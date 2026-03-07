import type Redis from "ioredis";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
}

const DEFAULT_RPM = 60;
const DEFAULT_SESSION_RPM = 20;

export async function checkRateLimit(
  redis: Redis,
  tenantId: string,
  maxPerMinute: number | null | undefined,
): Promise<RateLimitResult> {
  const limit = maxPerMinute ?? DEFAULT_RPM;
  const nowSec = Math.floor(Date.now() / 1000);
  const minuteTs = nowSec - (nowSec % 60);
  const key = `rl:${tenantId}:${minuteTs}`;
  const resetAt = minuteTs + 60;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 120);
  }

  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);

  return { allowed, limit, remaining, resetAt };
}

export async function checkSessionRateLimit(
  redis: Redis,
  sessionId: string,
  maxPerMinute?: number | null,
): Promise<RateLimitResult> {
  const limit = maxPerMinute ?? DEFAULT_SESSION_RPM;
  const nowSec = Math.floor(Date.now() / 1000);
  const minuteTs = nowSec - (nowSec % 60);
  const key = `rl:session:${sessionId}:${minuteTs}`;
  const resetAt = minuteTs + 60;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 120);
  }

  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);

  return { allowed, limit, remaining, resetAt };
}
