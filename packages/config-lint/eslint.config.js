import eslint from "@eslint/js";
import drizzle from "eslint-plugin-drizzle";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { drizzle },
    rules: {
      "drizzle/enforce-delete-with-where": "error",
      "drizzle/enforce-update-with-where": "error",
    },
  },
  prettier,
  {
    ignores: ["dist/", ".next/", "node_modules/"],
  },
);
