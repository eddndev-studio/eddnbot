import type Redis from "ioredis";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import type { Database } from "@eddnbot/db/client";
import { usageEvents, tenantQuotas } from "@eddnbot/db/schema";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// --- Track functions ---

export async function trackAiTokens(
  db: Database,
  redis: Redis,
  tenantId: string,
  data: { provider: string; model: string; inputTokens: number; outputTokens: number },
): Promise<void> {
  const totalTokens = data.inputTokens + data.outputTokens;

  await db.insert(usageEvents).values({
    tenantId,
    eventType: "ai_tokens",
    provider: data.provider,
    model: data.model,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
  });

  const month = currentMonth();
  const key = `quota:${tenantId}:ai_tokens:${month}`;
  await redis.incrby(key, totalTokens);
  await redis.expire(key, 35 * 24 * 60 * 60); // 35 days
}

export async function trackWhatsAppMessage(
  db: Database,
  redis: Redis,
  tenantId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(usageEvents).values({
    tenantId,
    eventType: "whatsapp_message",
    metadata: metadata ?? {},
  });

  const month = currentMonth();
  const key = `quota:${tenantId}:whatsapp_messages:${month}`;
  await redis.incr(key);
  await redis.expire(key, 35 * 24 * 60 * 60);
}

export async function trackApiRequest(
  db: Database,
  redis: Redis,
  tenantId: string,
  data: { endpoint: string; method: string; statusCode: number },
): Promise<void> {
  await db.insert(usageEvents).values({
    tenantId,
    eventType: "api_request",
    endpoint: data.endpoint,
    method: data.method,
    statusCode: data.statusCode,
  });

  const month = currentMonth();
  const key = `quota:${tenantId}:api_requests:${month}`;
  await redis.incr(key);
  await redis.expire(key, 35 * 24 * 60 * 60);
}

// --- Quota check ---

export type QuotaType = "ai_tokens" | "whatsapp_messages" | "api_requests";

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
}

const QUOTA_REDIS_KEY_MAP: Record<QuotaType, string> = {
  ai_tokens: "ai_tokens",
  whatsapp_messages: "whatsapp_messages",
  api_requests: "api_requests",
};

const QUOTA_COLUMN_MAP: Record<QuotaType, "maxAiTokensPerMonth" | "maxWhatsappMessagesPerMonth" | "maxApiRequestsPerMonth"> = {
  ai_tokens: "maxAiTokensPerMonth",
  whatsapp_messages: "maxWhatsappMessagesPerMonth",
  api_requests: "maxApiRequestsPerMonth",
};

const QUOTA_EVENT_TYPE_MAP: Record<QuotaType, string> = {
  ai_tokens: "ai_tokens",
  whatsapp_messages: "whatsapp_message",
  api_requests: "api_request",
};

export async function checkQuota(
  db: Database,
  redis: Redis,
  tenantId: string,
  quotaType: QuotaType,
): Promise<QuotaCheckResult> {
  // Load quota config
  const [quota] = await db
    .select()
    .from(tenantQuotas)
    .where(eq(tenantQuotas.tenantId, tenantId));

  const column = QUOTA_COLUMN_MAP[quotaType];
  const limit = quota?.[column] ?? null;

  if (limit === null) {
    return { allowed: true, current: 0, limit: null };
  }

  // Try Redis first
  const month = currentMonth();
  const redisKey = `quota:${tenantId}:${QUOTA_REDIS_KEY_MAP[quotaType]}:${month}`;
  let current = await redis.get(redisKey);

  if (current === null) {
    // Cache miss — reconstruct from PG
    const monthStart = new Date(`${month}-01T00:00:00Z`);
    const nextMonth = new Date(monthStart);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

    const eventType = QUOTA_EVENT_TYPE_MAP[quotaType];

    if (quotaType === "ai_tokens") {
      const [result] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${usageEvents.inputTokens}) + SUM(${usageEvents.outputTokens}), 0)`,
        })
        .from(usageEvents)
        .where(
          and(
            eq(usageEvents.tenantId, tenantId),
            eq(usageEvents.eventType, eventType),
            gte(usageEvents.createdAt, monthStart),
            lt(usageEvents.createdAt, nextMonth),
          ),
        );
      const total = Number(result?.total ?? 0);
      await redis.set(redisKey, total, "EX", 35 * 24 * 60 * 60);
      current = String(total);
    } else {
      const [result] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(usageEvents)
        .where(
          and(
            eq(usageEvents.tenantId, tenantId),
            eq(usageEvents.eventType, eventType),
            gte(usageEvents.createdAt, monthStart),
            lt(usageEvents.createdAt, nextMonth),
          ),
        );
      const total = Number(result?.count ?? 0);
      await redis.set(redisKey, total, "EX", 35 * 24 * 60 * 60);
      current = String(total);
    }
  }

  const currentNum = Number(current);
  return {
    allowed: currentNum < limit,
    current: currentNum,
    limit,
  };
}
