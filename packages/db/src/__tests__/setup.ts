import { afterEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { testDb, testClient } from "./helpers/test-db";

afterEach(async () => {
  await testDb.execute(sql`TRUNCATE TABLE usage_events, tenant_quotas, messages, conversations, whatsapp_accounts, ai_configs, api_keys, account_credentials, tenant_members, accounts, tenants CASCADE`);
});

afterAll(async () => {
  await testClient.end();
});
