import type Redis from "ioredis";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
}

const DEFAULT_RPM = 60;
const DEFAULT_SESSION_RPM = 20;
const ADMIN_RPM = 10;
const ADMIN_FAIL_LIMIT = 5;
const ADMIN_LOCKOUT_SECONDS = 900; // 15 minutes

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

export async function checkAdminRateLimit(
  redis: Redis,
  ip: string,
): Promise<RateLimitResult & { locked: boolean }> {
  const lockKey = `rl:admin:lock:${ip}`;
  const locked = await redis.exists(lockKey);
  if (locked) {
    const ttl = await redis.ttl(lockKey);
    return {
      allowed: false,
      locked: true,
      limit: ADMIN_RPM,
      remaining: 0,
      resetAt: Math.floor(Date.now() / 1000) + Math.max(1, ttl),
    };
  }

  const limit = ADMIN_RPM;
  const nowSec = Math.floor(Date.now() / 1000);
  const minuteTs = nowSec - (nowSec % 60);
  const key = `rl:admin:${ip}:${minuteTs}`;
  const resetAt = minuteTs + 60;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 120);
  }

  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);

  return { allowed, locked: false, limit, remaining, resetAt };
}

export async function recordAdminFailure(
  redis: Redis,
  ip: string,
): Promise<{ locked: boolean }> {
  const nowSec = Math.floor(Date.now() / 1000);
  const minuteTs = nowSec - (nowSec % 60);
  const failKey = `rl:admin:fail:${ip}:${minuteTs}`;

  const count = await redis.incr(failKey);
  if (count === 1) {
    await redis.expire(failKey, 120);
  }

  if (count >= ADMIN_FAIL_LIMIT) {
    const lockKey = `rl:admin:lock:${ip}`;
    await redis.set(lockKey, "1", "EX", ADMIN_LOCKOUT_SECONDS);
    return { locked: true };
  }

  return { locked: false };
}
