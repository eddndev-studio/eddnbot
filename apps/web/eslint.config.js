import base from "@eddnbot/config-lint/eslint";

export default [
  ...base,
  {
    ignores: ["dist/", "src/routeTree.gen.ts"],
  },
];
