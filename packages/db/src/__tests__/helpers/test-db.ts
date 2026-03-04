import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../../schema/index";

const TEST_DATABASE_URL = "postgresql://eddnbot:eddnbot@localhost:5432/eddnbot_test";

export const testClient = postgres(TEST_DATABASE_URL);
export const testDb = drizzle(testClient, { schema });
