import { defineWorkspace } from "vitest/config";

export default defineWorkspace(["packages/db", "packages/ai", "packages/whatsapp", "apps/api"]);
