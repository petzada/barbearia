import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Folga para envio de arquivos (a foto já é reduzida no navegador).
      bodySizeLimit: "4mb",
    },
  },
  images: {
    // As imagens locais já são .webp otimizadas; evita depender do binding
    // pago de Cloudflare Images.
    unoptimized: true,
  },
};

export default nextConfig;

// Disponibiliza os bindings do wrangler.jsonc (D1, R2) em `next dev`.
// CF_PERSIST_DIR isola o estado local (ex.: banco descartável do E2E).
if (process.env.NODE_ENV === "development") {
  const persistDir = process.env.CF_PERSIST_DIR;
  void initOpenNextCloudflareForDev(persistDir ? { persist: { path: persistDir } } : undefined);
}
