import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    // As imagens locais já são .webp otimizadas; evita depender do binding
    // pago de Cloudflare Images.
    unoptimized: true,
  },
};

export default nextConfig;

// Disponibiliza os bindings do wrangler.jsonc (D1, R2) em `next dev`.
if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev();
}
