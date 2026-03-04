import { afterEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { testDb, testClient } from "./helpers/test-db";

afterEach(async () => {
  await testDb.execute(sql`TRUNCATE TABLE messages, conversations, whatsapp_accounts, ai_configs, api_keys, users, tenants CASCADE`);
});

afterAll(async () => {
  await testClient.end();
});
