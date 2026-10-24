import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { applyConnectionWebhook } from "@/server/whatsapp/service";

/** Eventos `connection.update` da WhatsMiau (URL com `?secret=<WHATSMIAU_WEBHOOK_SECRET>`). */
export async function POST(request: Request) {
  const env = await getServerEnv();
  const secret = new URL(request.url).searchParams.get("secret");
  if (!env.whatsmiauWebhookSecret || secret !== env.whatsmiauWebhookSecret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const applied = await applyConnectionWebhook(await getDb(), payload);
  return NextResponse.json({ ok: true, applied });
}
