import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { createBillingDeps, runSubscriptionBilling } from "@/server/payments/service";

/**
 * Cobranças do Clube (renovações no cartão, Pix das renovações, novas
 * tentativas, carência e cancelamentos). Disparado de hora em hora pelo Cron
 * Trigger do Worker (worker.ts) com `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const env = await getServerEnv();
  const auth = request.headers.get("authorization");
  if (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const summary = await runSubscriptionBilling(await getDb(), createBillingDeps(env));
  return NextResponse.json({ ok: true, ...summary });
}
