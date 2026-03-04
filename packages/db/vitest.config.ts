import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    globalSetup: "./src/__tests__/global-setup.ts",
    setupFiles: ["./src/__tests__/setup.ts"],
  },
});
