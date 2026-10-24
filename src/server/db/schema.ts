import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { PLAN_CYCLES } from "@/lib/plans";

/**
 * Esquema único da Barbearia do Moura (Cloudflare D1 / SQLite).
 *
 * - Instantes são guardados em milissegundos UTC (`timestamp_ms`).
 * - Valores monetários são inteiros em centavos.
 * - Tabelas `user`, `session`, `account`, `verification` e `rate_limit`
 *   seguem o modelo do Better Auth (chaves camelCase = nomes de campo dele).
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

// ---------------------------------------------------------------------------
// Auth (Better Auth) + papéis
// ---------------------------------------------------------------------------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: integer("phone_number_verified", { mode: "boolean" }),
  /** Nome confirmado pelo próprio usuário (cadastro por telefone nasce sem nome). */
  profileCompleted: integer("profile_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  isBarber: integer("is_barber", { mode: "boolean" }).notNull().default(false),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  acceptingBookings: integer("accepting_bookings", { mode: "boolean" })
    .notNull()
    .default(true),
  /** % de comissão do barbeiro sobre o preço de tabela (0–100). */
  commissionPercent: integer("commission_percent").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

// ---------------------------------------------------------------------------
// Catálogo e configurações
// ---------------------------------------------------------------------------

export const services = sqliteTable(
  "services",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    check("services_duration_positive", sql`${t.durationMinutes} > 0`),
    check("services_price_non_negative", sql`${t.priceCents} >= 0`),
  ],
);

/** Uma linha por dia da semana (0 = domingo), horários "HH:MM" em America/Sao_Paulo. */
export const businessHours = sqliteTable(
  "business_hours",
  {
    weekday: integer("weekday").primaryKey(),
    openTime: text("open_time").notNull(),
    closeTime: text("close_time").notNull(),
    isClosed: integer("is_closed", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    check("business_hours_weekday_range", sql`${t.weekday} between 0 and 6`),
    check(
      "business_hours_close_after_open",
      sql`${t.isClosed} = 1 or ${t.closeTime} > ${t.openTime}`,
    ),
  ],
);

/** Linha única (id = 1): dados da barbearia e regras de agendamento configuráveis. */
export const shopSettings = sqliteTable("shop_settings", {
  id: integer("id").primaryKey(),
  shopName: text("shop_name").notNull().default("Barbearia do Moura"),
  phone: text("phone"),
  address: text("address"),
  instagram: text("instagram"),
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
  minLeadMinutes: integer("min_lead_minutes").notNull().default(30),
  bookingWindowDays: integer("booking_window_days").notNull().default(30),
  cancelUntilMinutes: integer("cancel_until_minutes").notNull().default(120),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Agenda: agendamentos e bloqueios na mesma tabela
// ---------------------------------------------------------------------------

export const ENTRY_TYPES = ["appointment", "block"] as const;
export const ENTRY_STATUSES = [
  "booked",
  "completed",
  "no_show",
  "cancelled",
] as const;
export const PAYMENT_METHODS = ["pix", "local", "subscription"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "unpaid"] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];
export type EntryStatus = (typeof ENTRY_STATUSES)[number];
export type EntryPaymentMethod = (typeof PAYMENT_METHODS)[number];
export type EntryPaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const scheduleEntries = sqliteTable(
  "schedule_entries",
  {
    id: id(),
    barberId: text("barber_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    type: text("type", { enum: ENTRY_TYPES }).notNull(),
    clientId: text("client_id").references(() => user.id, {
      onDelete: "set null",
    }),
    serviceId: text("service_id").references(() => services.id, {
      onDelete: "restrict",
    }),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: ENTRY_STATUSES }).notNull().default("booked"),
    note: text("note"),
    /** Snapshot do preço de tabela no momento do agendamento. */
    priceCents: integer("price_cents"),
    paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }),
    paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES }),
    /** Snapshot da comissão gravado na conclusão. */
    commissionPercent: integer("commission_percent"),
    commissionCents: integer("commission_cents"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    completedById: text("completed_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
    cancelledById: text("cancelled_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index("schedule_entries_barber_start_idx").on(t.barberId, t.startsAt),
    index("schedule_entries_client_start_idx").on(t.clientId, t.startsAt),
    check("schedule_entries_ends_after_start", sql`${t.endsAt} > ${t.startsAt}`),
    check(
      "schedule_entries_appointment_has_service",
      sql`${t.type} = 'block' or (${t.serviceId} is not null and ${t.clientId} is not null)`,
    ),
  ],
);

export const feedbacks = sqliteTable(
  "feedbacks",
  {
    id: id(),
    entryId: text("entry_id")
      .notNull()
      .unique()
      .references(() => scheduleEntries.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    barberId: text("barber_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: createdAt(),
  },
  (t) => [
    index("feedbacks_barber_idx").on(t.barberId, t.createdAt),
    check("feedbacks_rating_range", sql`${t.rating} between 1 and 5`),
  ],
);

// ---------------------------------------------------------------------------
// Clube de assinaturas e pagamentos (AbacatePay ou registro manual)
// ---------------------------------------------------------------------------

export { PLAN_CYCLES, type PlanCycle } from "@/lib/plans";

export const plans = sqliteTable("plans", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  cycle: text("cycle", { enum: PLAN_CYCLES }).notNull().default("MONTHLY"),
  /** Lista de benefícios exibida ao cliente (JSON array de strings). */
  benefits: text("benefits", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Produto correspondente no AbacatePay (criado sob demanda). */
  providerProductId: text("provider_product_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const SUBSCRIPTION_STATUSES = [
  "pending",
  "active",
  "cancelled",
  "expired",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMENT_PROVIDERS = ["abacatepay", "manual"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: text("status", { enum: SUBSCRIPTION_STATUSES })
      .notNull()
      .default("pending"),
    provider: text("provider", { enum: PAYMENT_PROVIDERS }).notNull(),
    /** CARD | PIX (AbacatePay) ou forma registrada manualmente. */
    method: text("method"),
    providerCheckoutId: text("provider_checkout_id").unique(),
    providerCheckoutUrl: text("provider_checkout_url"),
    providerSubscriptionId: text("provider_subscription_id").unique(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("subscriptions_user_idx").on(t.userId, t.status),
    // No máximo uma assinatura ativa por cliente.
    uniqueIndex("subscriptions_one_active_per_user")
      .on(t.userId)
      .where(sql`${t.status} = 'active'`),
  ],
);

export const PAYMENT_KINDS = ["appointment", "subscription"] as const;
export const PAYMENT_RECORD_STATUSES = [
  "pending",
  "paid",
  "expired",
  "cancelled",
  "refunded",
] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    kind: text("kind", { enum: PAYMENT_KINDS }).notNull(),
    entryId: text("entry_id").references(() => scheduleEntries.id, {
      onDelete: "set null",
    }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    provider: text("provider", { enum: PAYMENT_PROVIDERS }).notNull(),
    /** PIX | CARD (online) ou dinheiro/cartão/pix registrados no balcão. */
    method: text("method").notNull(),
    providerId: text("provider_id").unique(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", { enum: PAYMENT_RECORD_STATUSES })
      .notNull()
      .default("pending"),
    brCode: text("br_code"),
    brCodeBase64: text("br_code_base64"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    recordedById: text("recorded_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    devMode: integer("dev_mode", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("payments_entry_idx").on(t.entryId),
    index("payments_subscription_idx").on(t.subscriptionId),
    index("payments_paid_at_idx").on(t.status, t.paidAt),
    check("payments_amount_non_negative", sql`${t.amountCents} >= 0`),
  ],
);

/** Deduplicação de webhooks (o id do evento se repete em cada retentativa). */
export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  event: text("event").notNull(),
  receivedAt: integer("received_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// WhatsApp (WhatsMiau): instância, template de lembrete e logs de envio
// ---------------------------------------------------------------------------

export const WHATSAPP_INSTANCE_STATUSES = [
  "not_configured",
  "connecting",
  "connected",
  "disconnected",
  "qr_required",
  "unknown",
] as const;
export type WhatsappInstanceStatus = (typeof WHATSAPP_INSTANCE_STATUSES)[number];

export const whatsappConfig = sqliteTable("whatsapp_config", {
  id: integer("id").primaryKey(),
  instanceId: text("instance_id"),
  instanceName: text("instance_name"),
  status: text("status", { enum: WHATSAPP_INSTANCE_STATUSES })
    .notNull()
    .default("not_configured"),
  phoneConnected: text("phone_connected"),
  /** Último QR code (base64/data URL) para parear o WhatsApp da barbearia. */
  qrCode: text("qr_code"),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp_ms" }),
  remindersEnabled: integer("reminders_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  reminderTemplate: text("reminder_template"),
  updatedAt: updatedAt(),
});

export const WHATSAPP_LOG_KINDS = ["otp", "reminder", "test"] as const;
export const WHATSAPP_LOG_STATUSES = [
  "pending",
  "sent",
  "failed",
  "skipped",
] as const;
export type WhatsappLogKind = (typeof WHATSAPP_LOG_KINDS)[number];
export type WhatsappLogStatus = (typeof WHATSAPP_LOG_STATUSES)[number];

export const whatsappLogs = sqliteTable(
  "whatsapp_logs",
  {
    id: id(),
    kind: text("kind", { enum: WHATSAPP_LOG_KINDS }).notNull(),
    entryId: text("entry_id").references(() => scheduleEntries.id, {
      onDelete: "set null",
    }),
    toPhone: text("to_phone").notNull(),
    status: text("status", { enum: WHATSAPP_LOG_STATUSES })
      .notNull()
      .default("pending"),
    /** Texto enviado (nunca guarda o código de OTP). */
    message: text("message"),
    error: text("error"),
    providerMessageId: text("provider_message_id"),
    /** Idempotência dos lembretes: `reminder:<entryId>`. */
    dedupeKey: text("dedupe_key").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("whatsapp_logs_created_idx").on(t.createdAt)],
);

export const schema = {
  user,
  session,
  account,
  verification,
  rateLimit,
  services,
  businessHours,
  shopSettings,
  scheduleEntries,
  feedbacks,
  plans,
  subscriptions,
  payments,
  webhookEvents,
  whatsappConfig,
  whatsappLogs,
};
