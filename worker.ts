// Worker de entrada: reaproveita o handler gerado pelo OpenNext e adiciona
// o Cron Trigger (de hora em hora) que chama as rotas internas de lembretes
// (só envia na hora configurada no painel do WhatsApp) e de cobranças do clube.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- arquivo pode ou não existir antes do build.
// @ts-ignore `.open-next/worker.js` é gerado no build (opennextjs-cloudflare build).
import { default as handler } from "./.open-next/worker.js";

type Env = { CRON_SECRET?: string; APP_BASE_URL?: string };

export default {
  fetch: handler.fetch,

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    const base = env.APP_BASE_URL ?? "https://barbearia-do-moura.workers.dev";
    for (const path of ["/api/cron/lembretes", "/api/cron/assinaturas"]) {
      const request = new Request(new URL(path, base), {
        headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` },
      });
      ctx.waitUntil(handler.fetch(request, env, ctx));
    }
  },
} satisfies ExportedHandler<Env>;
