import { afterEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { testDb, testClient } from "./helpers/test-db";
import { testRedis } from "./helpers/test-redis";

afterEach(async () => {
  await testDb.execute(sql`TRUNCATE TABLE usage_events, tenant_quotas, messages, conversations, whatsapp_accounts, ai_configs, api_keys, users, tenants CASCADE`);
  await testRedis.flushdb();
});

afterAll(async () => {
  await testRedis.quit();
  await testClient.end();
});
