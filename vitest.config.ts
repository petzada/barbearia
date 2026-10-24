import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  test: {
    // Padrão: Node (domínio + D1 via Miniflare). Componentes usam
    // `// @vitest-environment jsdom` no topo do arquivo.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
