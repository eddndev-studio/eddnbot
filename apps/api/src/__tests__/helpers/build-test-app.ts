import { buildApp } from "../../app";
import type { Env } from "../../env";

const testEnv: Env = {
  DATABASE_URL: "postgresql://eddnbot:eddnbot@localhost:5432/eddnbot_test",
  REDIS_URL: "redis://localhost:6379",
  PORT: 0,
  HOST: "127.0.0.1",
  NODE_ENV: "test",
  OPENAI_API_KEY: "sk-test-fake-key",
  ANTHROPIC_API_KEY: "sk-ant-test-fake-key",
  GOOGLE_GEMINI_API_KEY: "test-gemini-fake-key",
  WHATSAPP_APP_SECRET: "test-whatsapp-app-secret",
  WHATSAPP_VERIFY_TOKEN: "test-whatsapp-verify-token",
  WHATSAPP_API_VERSION: "v21.0",
};

export function buildTestApp() {
  return buildApp(testEnv);
}
