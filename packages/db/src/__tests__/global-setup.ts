import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_BASE_URL = "postgresql://eddnbot:eddnbot@localhost:5432";
const TEST_DB = "eddnbot_test";

function getBaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    // Strip the database name to get the base URL
    return dbUrl.replace(/\/[^/]+$/, "");
  }
  return DEFAULT_BASE_URL;
}

export async function setup() {
  const baseUrl = getBaseUrl();
  const adminSql = postgres(`${baseUrl}/postgres`);
  const exists = await adminSql`SELECT 1 FROM pg_database WHERE datname = ${TEST_DB}`;
  if (exists.length === 0) {
    await adminSql.unsafe(`CREATE DATABASE "${TEST_DB}"`);
  }
  await adminSql.end();

  const testSql = postgres(`${baseUrl}/${TEST_DB}`, { max: 1 });
  const db = drizzle(testSql);
  await migrate(db, { migrationsFolder: resolve(__dirname, "../../drizzle") });
  await testSql.end();
}
