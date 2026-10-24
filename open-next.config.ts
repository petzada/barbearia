import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Todas as rotas autenticadas são dinâmicas (SSR); não há ISR, então o
// cache incremental em R2 não é necessário.
export default defineCloudflareConfig({});
