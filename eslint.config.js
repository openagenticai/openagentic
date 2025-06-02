// @ts-check

import { defineConfig } from "@ilyasemenov/eslint-config"

export default defineConfig().append({
  ignores: [
    "**/public/**",
    "**/dist/**",
    "**/node_modules/**",
    "**/build/**",
    "**/coverage/**",
    "**/pnpm-lock.yaml",
    "**/.env*",
    "**/*.md",
    "**/.gitignore",
    "**/.gitattributes",
    "**/.dockerignore",
    "**/Dockerfile*",
  ],
}, {
  files: ["**/*.tst.ts"],
  rules: {
    "unused-imports/no-unused-vars": "off",
  },
})
