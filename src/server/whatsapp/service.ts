import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Db } from "../db";
import {
  scheduleEntries,
  services,
  user,
  whatsappConfig,
  whatsappLogs,
  type WhatsappInstanceStatus,
  type WhatsappLogKind,
} from "../db/schema";
import { assertAdmin, type Actor } from "../actor";
import { DomainError } from "../errors";
import type { ServerEnv } from "../env";
import { getShopSettings } from "../settings";
import { WhatsmiauClient } from "./client";
import { extractInstanceIdFromPayload, extractProviderMessageId, extractStatusSnapshotFromPayload, findInstanceInList } from "./parser";
import { parseConnectionUpdateEvent } from "./connection";
import { DEFAULT_WHATSAPP_TEMPLATE, OTP_MESSAGE, renderWhatsappTemplate } from "./template";
import { normalizeBrazilPhone, formatBrazilPhone } from "@/lib/phone";
import { formatSelectableDay, formatSlotTime } from "@/lib/agenda/availability";
import { spDayBounds, todayDateKeySP } from "@/lib/agenda/timezone";

export type WhatsappConfig = typeof whatsappConfig.$inferSelect;

/** Subconjunto do cliente usado aqui — permite injetar um fake nos testes. */
export type WhatsappGateway = Pick<
  WhatsmiauClient,
  "sendText" | "createInstance" | "connectInstance" | "deleteInstance" | "listInstances"
>;

export function createWhatsappGateway(env: ServerEnv): WhatsappGateway | null {
  if (!env.whatsmiauApiKey) return null;
  return new WhatsmiauClient({ baseUrl: env.whatsmiauBaseUrl, apiKey: env.whatsmiauApiKey });
}

const DEFAULT_INSTANCE_NAME = "barbearia-do-moura";
const OTP_MAX_PER_WINDOW = 3;
const OTP_WINDOW_MS = 10 * 60_000;

export async function getWhatsappConfig(db: Db): Promise<WhatsappConfig> {
  const row = await db.query.whatsappConfig.findFirst({ where: eq(whatsappConfig.id, 1) });
  if (row) return row;
  const [created] = await db
    .insert(whatsappConfig)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.query.whatsappConfig.findFirst({ where: eq(whatsappConfig.id, 1) }))!;
}

async function updateConfig(db: Db, values: Partial<typeof whatsappConfig.$inferInsert>) {
  await getWhatsappConfig(db);
  const [row] = await db
    .update(whatsappConfig)
    .set(values)
    .where(eq(whatsappConfig.id, 1))
    .returning();
  return row;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Falha inesperada.";

/** Envia texto registrando o log (status, erro, id do provedor). */
async function sendWithLog(
  db: Db,
  gateway: WhatsappGateway | null,
  input: {
    kind: WhatsappLogKind;
    to: string;
    text: string;
    /** Texto salvo no log (o OTP nunca é gravado). */
    logText: string;
    entryId?: string;
    dedupeKey?: string;
  },
): Promise<{ sent: boolean; error: string | null; skipped?: boolean }> {
  const phone = normalizeBrazilPhone(input.to);
  const [log] = await db
    .insert(whatsappLogs)
    .values({
      kind: input.kind,
      toPhone: phone.normalized ?? input.to,
      message: input.logText,
      entryId: input.entryId ?? null,
      dedupeKey: input.dedupeKey ?? null,
    })
    .onConflictDoNothing({ target: whatsappLogs.dedupeKey })
    .returning({ id: whatsappLogs.id });
  if (!log) return { sent: false, error: null, skipped: true }; // já enviado antes

  const finish = (values: Partial<typeof whatsappLogs.$inferInsert>) =>
    db.update(whatsappLogs).set(values).where(eq(whatsappLogs.id, log.id));

  if (!phone.isValid || !phone.normalized) {
    await finish({ status: "skipped", error: phone.reason ?? "Telefone inválido." });
    return { sent: false, error: phone.reason ?? "Telefone inválido." };
  }
  const config = await getWhatsappConfig(db);
  if (!gateway || !config.instanceId) {
    await finish({ status: "failed", error: "WhatsApp não configurado." });
    return { sent: false, error: "WhatsApp não configurado." };
  }
  try {
    const response = await gateway.sendText(config.instanceId, phone.normalized, input.text);
    await finish({ status: "sent", providerMessageId: extractProviderMessageId(response) });
    return { sent: true, error: null };
  } catch (error) {
    await finish({ status: "failed", error: errorMessage(error) });
    return { sent: false, error: errorMessage(error) };
  }
}

/**
 * Entrega o código de login pelo WhatsApp da barbearia.
 * Limita envios por telefone (além do rate limit por IP do Better Auth).
 * Em desenvolvimento com AUTH_DEV_OTP, só registra o código no log do servidor.
 */
export async function sendLoginCode(
  db: Db,
  env: ServerEnv,
  gateway: WhatsappGateway | null,
  phoneNumber: string,
  code: string,
  now: Date = new Date(),
): Promise<void> {
  const phone = normalizeBrazilPhone(phoneNumber);
  if (!phone.isValid || !phone.normalized) {
    throw new DomainError("invalid", "Informe um WhatsApp válido com DDD.");
  }
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)` })
    .from(whatsappLogs)
    .where(
      and(
        eq(whatsappLogs.kind, "otp"),
        eq(whatsappLogs.toPhone, phone.normalized),
        gte(whatsappLogs.createdAt, new Date(now.getTime() - OTP_WINDOW_MS)),
      ),
    );
  if (recent >= OTP_MAX_PER_WINDOW) {
    throw new DomainError(
      "invalid",
      "Muitos códigos pedidos para este número. Aguarde alguns minutos e tente de novo.",
    );
  }

  if (env.devOtp) {
    console.info(`[auth:dev] código para ${formatBrazilPhone(phoneNumber)}: ${code} (ou ${env.devOtp})`);
    await db.insert(whatsappLogs).values({
      kind: "otp",
      toPhone: phone.normalized,
      status: "skipped",
      message: "Código de acesso (modo desenvolvimento)",
    });
    return;
  }

  const { shopName } = await getShopSettings(db);
  const result = await sendWithLog(db, gateway, {
    kind: "otp",
    to: phone.normalized,
    text: OTP_MESSAGE(code, shopName),
    logText: "Código de acesso",
  });
  if (!result.sent) {
    throw new DomainError(
      "provider",
      "Não conseguimos enviar o código pelo WhatsApp agora. Tente entrar com o Google ou fale com a barbearia.",
    );
  }
}

// ---------------------------------------------------------------------------
// Gestão da instância (admin)
// ---------------------------------------------------------------------------

function requireGateway(gateway: WhatsappGateway | null): WhatsappGateway {
  if (!gateway) {
    throw new DomainError("provider", "Configure WHATSMIAU_API_KEY para usar o WhatsApp.");
  }
  return gateway;
}

function statusFromSnapshot(
  snapshot: { status: WhatsappInstanceStatus; qrCode: string | null },
  fallback: WhatsappInstanceStatus,
): WhatsappInstanceStatus {
  if (snapshot.status !== "unknown") return snapshot.status;
  if (snapshot.qrCode) return "qr_required";
  return fallback;
}

export async function createInstance(
  db: Db,
  actor: Actor,
  gateway: WhatsappGateway | null,
  instanceName?: string,
): Promise<WhatsappConfig> {
  assertAdmin(actor);
  const client = requireGateway(gateway);
  const current = await getWhatsappConfig(db);
  const name = instanceName?.trim() || current.instanceName || DEFAULT_INSTANCE_NAME;
  const created = await client.createInstance(name);
  const instanceId = extractInstanceIdFromPayload(created) ?? name;
  let connect: unknown = null;
  try {
    connect = await client.connectInstance(instanceId);
  } catch (error) {
    console.warn("[whatsapp] falha ao conectar após criar instância", error);
  }
  const snapshot = extractStatusSnapshotFromPayload(connect ?? created);
  return updateConfig(db, {
    instanceId: snapshot.instanceId ?? instanceId,
    instanceName: name,
    status: statusFromSnapshot(snapshot, "connecting"),
    qrCode: snapshot.qrCode,
    phoneConnected: snapshot.phoneConnected,
    lastSyncAt: new Date(),
  });
}

/** Pede um novo QR code / reconexão. */
export async function refreshQrCode(
  db: Db,
  actor: Actor,
  gateway: WhatsappGateway | null,
): Promise<WhatsappConfig> {
  assertAdmin(actor);
  const client = requireGateway(gateway);
  const current = await getWhatsappConfig(db);
  if (!current.instanceId) throw new DomainError("invalid", "Crie a instância primeiro.");
  const response = await client.connectInstance(current.instanceId);
  const snapshot = extractStatusSnapshotFromPayload(response);
  const status = statusFromSnapshot(snapshot, "connecting");
  return updateConfig(db, {
    status,
    qrCode: status === "connected" ? null : snapshot.qrCode ?? current.qrCode,
    phoneConnected: snapshot.phoneConnected ?? current.phoneConnected,
    lastSyncAt: new Date(),
  });
}

export async function syncInstanceStatus(
  db: Db,
  gateway: WhatsappGateway | null,
): Promise<WhatsappConfig> {
  const current = await getWhatsappConfig(db);
  if (!gateway || !current.instanceId) return current;
  let payload: unknown = null;
  try {
    payload = findInstanceInList(await gateway.listInstances(), current.instanceId);
  } catch (error) {
    console.warn("[whatsapp] falha ao listar instâncias no sync", error);
  }
  payload ??= await gateway.connectInstance(current.instanceId);
  const snapshot = extractStatusSnapshotFromPayload(payload);
  const status = snapshot.status === "unknown" ? current.status : snapshot.status;
  return updateConfig(db, {
    status,
    qrCode: status === "connected" ? null : snapshot.qrCode ?? current.qrCode,
    phoneConnected: snapshot.phoneConnected ?? current.phoneConnected,
    lastSyncAt: new Date(),
  });
}

export async function deleteInstance(
  db: Db,
  actor: Actor,
  gateway: WhatsappGateway | null,
): Promise<WhatsappConfig> {
  assertAdmin(actor);
  const current = await getWhatsappConfig(db);
  if (current.instanceId && gateway) {
    try {
      await gateway.deleteInstance(current.instanceId);
    } catch (error) {
      console.warn("[whatsapp] falha ao remover instância no provedor", error);
    }
  }
  return updateConfig(db, {
    instanceId: null,
    status: "not_configured",
    qrCode: null,
    phoneConnected: null,
    lastSyncAt: new Date(),
  });
}

export async function updateReminderSettings(
  db: Db,
  actor: Actor,
  input: { remindersEnabled: boolean; reminderTemplate: string | null; reminderHour?: number },
): Promise<WhatsappConfig> {
  assertAdmin(actor);
  const template = input.reminderTemplate?.trim() || null;
  if (template && template.length > 1000) {
    throw new DomainError("invalid", "A mensagem pode ter no máximo 1000 caracteres.");
  }
  if (input.reminderHour != null && !(Number.isInteger(input.reminderHour) && input.reminderHour >= 6 && input.reminderHour <= 20)) {
    throw new DomainError("invalid", "Escolha um horário de envio entre 6h e 20h.");
  }
  return updateConfig(db, {
    remindersEnabled: input.remindersEnabled,
    reminderTemplate: template,
    ...(input.reminderHour != null ? { reminderHour: input.reminderHour } : {}),
  });
}

export async function sendTestMessage(
  db: Db,
  actor: Actor,
  gateway: WhatsappGateway | null,
  to: string,
): Promise<void> {
  assertAdmin(actor);
  const { shopName } = await getShopSettings(db);
  const text = `Mensagem de teste da ${shopName}. Se você recebeu, o WhatsApp está funcionando ✅`;
  const result = await sendWithLog(db, gateway, { kind: "test", to, text, logText: text });
  if (!result.sent) {
    throw new DomainError("provider", `Falha no envio: ${result.error ?? "erro desconhecido"}`);
  }
}

export async function listWhatsappLogs(
  db: Db,
  actor: Actor,
  opts: { kind?: WhatsappLogKind; limit?: number } = {},
) {
  assertAdmin(actor);
  return db
    .select()
    .from(whatsappLogs)
    .where(opts.kind ? eq(whatsappLogs.kind, opts.kind) : undefined)
    .orderBy(desc(whatsappLogs.createdAt))
    .limit(opts.limit ?? 50);
}

/** Convite para a equipe pelo WhatsApp (pessoa ainda sem conta). */
export async function sendTeamInvite(
  db: Db,
  gateway: WhatsappGateway | null,
  input: { to: string; appBaseUrl: string },
): Promise<void> {
  const { shopName } = await getShopSettings(db);
  const text = `Você foi convidado para a equipe da ${shopName}! Entre em ${input.appBaseUrl}/login com este WhatsApp para acessar sua agenda.`;
  const result = await sendWithLog(db, gateway, { kind: "invite", to: input.to, text, logText: text });
  if (!result.sent) {
    throw new DomainError("provider", `Convite não enviado: ${result.error ?? "erro desconhecido"}`);
  }
}

/** Hora atual (0–23) em America/Sao_Paulo. */
export function currentHourSP(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(now),
  ) % 24;
}

/** Webhook `connection.update` da WhatsMiau: atualiza status e QR. */
export async function applyConnectionWebhook(db: Db, payload: unknown): Promise<boolean> {
  const event = parseConnectionUpdateEvent(payload);
  if (!event.isConnectionUpdate) return false;
  const current = await getWhatsappConfig(db);
  if (current.instanceId && event.instanceId && event.instanceId !== current.instanceId) {
    return false; // evento de outra instância
  }
  const status = event.status === "unknown" ? current.status : event.status;
  await updateConfig(db, {
    status,
    qrCode: status === "connected" ? null : event.qrCode ?? current.qrCode,
    phoneConnected: event.phoneConnected ?? current.phoneConnected,
    lastSyncAt: new Date(),
  });
  return true;
}

// ---------------------------------------------------------------------------
// Lembretes diários (Cron Trigger 08:00 SP)
// ---------------------------------------------------------------------------

export type ReminderSummary = {
  date: string;
  found: number;
  sent: number;
  failed: number;
  skipped: number;
  alreadySent: number;
  /** Fora da hora configurada de envio (cron horário). */
  notThisHour?: boolean;
};

export async function runDailyReminders(
  db: Db,
  gateway: WhatsappGateway | null,
  now: Date = new Date(),
  opts: { force?: boolean } = {},
): Promise<ReminderSummary> {
  const dateKey = todayDateKeySP(now);
  const summary: ReminderSummary = { date: dateKey, found: 0, sent: 0, failed: 0, skipped: 0, alreadySent: 0 };
  // O Cron Trigger roda de hora em hora; só envia na hora configurada.
  const stored = await getWhatsappConfig(db);
  if (!stored.remindersEnabled) return summary;
  if (!opts.force && currentHourSP(now) !== stored.reminderHour) return { ...summary, notThisHour: true };
  const config = gateway ? await syncInstanceStatus(db, gateway).catch(() => stored) : stored;

  const settings = await getShopSettings(db);
  const { end } = spDayBounds(dateKey);
  const barber = alias(user, "barber_user");
  const client = alias(user, "client_user");
  const rows = await db
    .select({
      id: scheduleEntries.id,
      startsAt: scheduleEntries.startsAt,
      clientName: client.name,
      clientPhone: client.phoneNumber,
      barberName: barber.name,
      serviceName: services.name,
    })
    .from(scheduleEntries)
    .innerJoin(barber, eq(barber.id, scheduleEntries.barberId))
    .innerJoin(client, eq(client.id, scheduleEntries.clientId))
    .innerJoin(services, eq(services.id, scheduleEntries.serviceId))
    .where(
      and(
        eq(scheduleEntries.type, "appointment"),
        eq(scheduleEntries.status, "booked"),
        eq(client.whatsappReminders, true),
        gte(scheduleEntries.startsAt, now),
        lt(scheduleEntries.startsAt, new Date(end)),
      ),
    );

  summary.found = rows.length;
  for (const row of rows) {
    if (!row.clientPhone) {
      summary.skipped += 1;
      continue;
    }
    const text = renderWhatsappTemplate(config.reminderTemplate ?? DEFAULT_WHATSAPP_TEMPLATE, {
      cliente_nome: row.clientName.split(/\s+/)[0],
      profissional_nome: row.barberName,
      servico_nome: row.serviceName,
      data_agendamento: formatSelectableDay(dateKey),
      hora_agendamento: formatSlotTime(row.startsAt),
      barbearia_nome: settings.shopName,
      telefone_barbearia: settings.phone ? formatBrazilPhone(settings.phone) : "",
      endereco_barbearia: settings.address ?? "",
    });
    const result = await sendWithLog(db, gateway, {
      kind: "reminder",
      to: row.clientPhone,
      text,
      logText: text,
      entryId: row.id,
      dedupeKey: `reminder:${row.id}`,
    });
    if (result.skipped) summary.alreadySent += 1;
    else if (result.sent) summary.sent += 1;
    else summary.failed += 1;
  }
  return summary;
}
