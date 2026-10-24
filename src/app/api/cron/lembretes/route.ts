import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { createWhatsappGateway, runDailyReminders } from "@/server/whatsapp/service";

/**
 * Lembretes do dia via WhatsApp. Disparado pelo Cron Trigger do Worker
 * (worker.ts, 08:00 SP) com `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const env = await getServerEnv();
  const auth = request.headers.get("authorization");
  if (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const summary = await runDailyReminders(await getDb(), createWhatsappGateway(env));
  return NextResponse.json({ ok: true, ...summary });
}
