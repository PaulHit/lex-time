import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Each test file gets its own module registry, and therefore its own
    // in-memory database — so tests never touch data/timesheet.db.
    env: {
      LEX_TIME_DB: ":memory:",
      LEX_TIME_SKIP_SEED: "1",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
