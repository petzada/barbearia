import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { verifyAbacateWebhook, type AbacateWebhookEvent } from "@/server/payments/abacatepay";
import { createBillingDeps, handleAbacateWebhook } from "@/server/payments/service";

/**
 * Webhook do AbacatePay. Cadastre a URL com `?webhookSecret=<ABACATEPAY_WEBHOOK_SECRET>`.
 * Responde 2xx em até 30s; erro 5xx faz o AbacatePay reenviar.
 */
export async function POST(request: Request) {
  const env = await getServerEnv();
  const rawBody = await request.text();
  const url = new URL(request.url);
  const valid = await verifyAbacateWebhook({
    rawBody,
    querySecret: url.searchParams.get("webhookSecret"),
    signature: request.headers.get("x-webhook-signature"),
    secret: env.abacatePayWebhookSecret,
    hmacKey: env.abacatePayWebhookHmacKey,
  });
  if (!valid) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let event: AbacateWebhookEvent;
  try {
    event = JSON.parse(rawBody) as AbacateWebhookEvent;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const result = await handleAbacateWebhook(await getDb(), createBillingDeps(env), event);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[webhook:abacatepay] falha ao processar", event.event, error);
    return NextResponse.json({ error: "Falha ao processar" }, { status: 500 });
  }
}
