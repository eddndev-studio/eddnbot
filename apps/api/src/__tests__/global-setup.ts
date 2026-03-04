import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DB = "eddnbot_test";
const BASE_URL = "postgresql://eddnbot:eddnbot@localhost:5432";

export async function setup() {
  const adminSql = postgres(`${BASE_URL}/postgres`);
  const exists = await adminSql`SELECT 1 FROM pg_database WHERE datname = ${TEST_DB}`;
  if (exists.length === 0) {
    await adminSql.unsafe(`CREATE DATABASE "${TEST_DB}"`);
  }
  await adminSql.end();

  const testSql = postgres(`${BASE_URL}/${TEST_DB}`, { max: 1 });
  const db = drizzle(testSql);
  await migrate(db, { migrationsFolder: resolve(__dirname, "../../../../packages/db/drizzle") });
  await testSql.end();
}
