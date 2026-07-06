import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // The `obsidian` npm package is types-only (no runtime). Tests that reach
      // impure modules resolve it to the stub in tests/fakes/obsidian.ts; the
      // in-memory vault (tests/fakes/fake-app.ts) builds on the same classes so
      // `instanceof TFile` holds across src and tests.
      obsidian: fileURLToPath(new URL("./tests/fakes/obsidian.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
