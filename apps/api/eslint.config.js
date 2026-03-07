import base from "@eddnbot/config-lint/eslint";

export default [
  ...base,
  {
    rules: {
      // Fastify app.delete() and storage.delete() trigger false positives
      "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: "db" }],
      "drizzle/enforce-update-with-where": ["error", { drizzleObjectName: "db" }],
    },
  },
  {
    files: ["src/__tests__/**"],
    rules: {
      // Test mocks use generator functions that throw before yielding
      "require-yield": "off",
    },
  },
];
