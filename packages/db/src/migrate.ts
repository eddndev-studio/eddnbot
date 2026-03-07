import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Database } from "./client";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(db: Database) {
  const migrationsFolder = resolve(__dirname, "../drizzle");
  await migrate(db, { migrationsFolder });
}
