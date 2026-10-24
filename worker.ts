// Worker de entrada: reaproveita o handler gerado pelo OpenNext e adiciona
// o Cron Trigger que dispara os lembretes de WhatsApp pela rota interna.
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
    const request = new Request(new URL("/api/cron/lembretes", base), {
      headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` },
    });
    ctx.waitUntil(handler.fetch(request, env, ctx));
  },
} satisfies ExportedHandler<Env>;
