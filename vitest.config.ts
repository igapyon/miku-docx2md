import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js", "lht-cmn/**/*.test.js"],
    exclude: ["workplace/**", "node_modules/**", "dist/**", "bundle/**"],
  },
});
