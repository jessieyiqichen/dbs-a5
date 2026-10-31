import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "supabase/functions/**/*.test.ts"],
    coverage: {
      include: ["src/lib/**/*.ts", "supabase/functions/*/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts", "supabase/functions/**/*.test.ts"],
    },
  },
});
