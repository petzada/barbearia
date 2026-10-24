/**
 * Cliente mínimo da API v2 do AbacatePay (https://docs.abacatepay.com).
 * Valores sempre em centavos. A chave (dev ou produção) define o ambiente.
 */

export const ABACATEPAY_BASE_URL = "https://api.abacatepay.com/v2";

export class AbacatePayError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AbacatePayError";
  }
}

export type PixStatus =
  | "PENDING"
  | "EXPIRED"
  | "CANCELLED"
  | "PAID"
  | "UNDER_DISPUTE"
  | "REFUNDED"
  | "REDEEMED"
  | "APPROVED"
  | "FAILED";

export type PixCharge = {
  id: string;
  amount: number;
  status: PixStatus;
  devMode: boolean;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
};

export type AbacateCycle = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "ANNUALLY";

export type AbacateProduct = { id: string; externalId: string; name: string; price: number };

export type SubscriptionCheckout = { id: string; url: string; status: string; devMode: boolean };

export type AbacateSubscription = {
  id: string;
  checkoutId: string | null;
  status: "PENDING" | "ACTIVE" | "CANCELLED";
  method: "PIX" | "CARD" | null;
  amount: number;
  devMode: boolean;
};

/** Interface usada pelo domínio — permite fake nos testes. */
export interface PaymentGateway {
  createPixCharge(input: {
    amountCents: number;
    description: string;
    expiresInSeconds: number;
    externalId: string;
    metadata?: Record<string, string>;
  }): Promise<PixCharge>;
  checkPixCharge(id: string): Promise<{ id: string; status: PixStatus; expiresAt: string | null }>;
  simulatePixPayment(id: string): Promise<void>;
  createProduct(input: {
    externalId: string;
    name: string;
    priceCents: number;
    description?: string | null;
    cycle: AbacateCycle;
  }): Promise<AbacateProduct>;
  createSubscriptionCheckout(input: {
    productId: string;
    externalId: string;
    returnUrl: string;
    completionUrl: string;
    metadata?: Record<string, string>;
  }): Promise<SubscriptionCheckout>;
  getSubscription(id: string): Promise<AbacateSubscription>;
  cancelSubscription(id: string): Promise<void>;
}

type Envelope<T> = { data: T | null; success?: boolean; error: string | null };

export class AbacatePayClient implements PaymentGateway {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = ABACATEPAY_BASE_URL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    options: { query?: Record<string, string>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) url.searchParams.set(k, v);
    const response = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    let payload: Envelope<T> | null = null;
    try {
      payload = (await response.json()) as Envelope<T>;
    } catch {
      payload = null;
    }
    if (!response.ok || !payload || payload.error || payload.data == null) {
      const message = payload?.error ?? `AbacatePay respondeu ${response.status}`;
      throw new AbacatePayError(message, response.status);
    }
    return payload.data;
  }

  createPixCharge(input: Parameters<PaymentGateway["createPixCharge"]>[0]) {
    return this.request<PixCharge>("POST", "/transparents/create", {
      body: {
        method: "PIX",
        data: {
          amount: input.amountCents,
          description: input.description.slice(0, 500),
          expiresIn: input.expiresInSeconds,
          externalId: input.externalId,
          metadata: input.metadata,
        },
      },
    });
  }

  checkPixCharge(id: string) {
    return this.request<{ id: string; status: PixStatus; expiresAt: string | null }>(
      "GET",
      "/transparents/check",
      { query: { id } },
    );
  }

  async simulatePixPayment(id: string) {
    await this.request<unknown>("POST", "/transparents/simulate-payment", { query: { id } });
  }

  createProduct(input: Parameters<PaymentGateway["createProduct"]>[0]) {
    return this.request<AbacateProduct>("POST", "/products/create", {
      body: {
        externalId: input.externalId,
        name: input.name,
        price: input.priceCents,
        currency: "BRL",
        description: input.description ?? undefined,
        cycle: input.cycle,
      },
    });
  }

  createSubscriptionCheckout(input: Parameters<PaymentGateway["createSubscriptionCheckout"]>[0]) {
    return this.request<SubscriptionCheckout>("POST", "/subscriptions/create", {
      body: {
        items: [{ id: input.productId, quantity: 1 }],
        methods: ["CARD", "PIX"],
        externalId: input.externalId,
        returnUrl: input.returnUrl,
        completionUrl: input.completionUrl,
        metadata: input.metadata,
      },
    });
  }

  getSubscription(id: string) {
    return this.request<AbacateSubscription>("GET", "/subscriptions/get", { query: { id } });
  }

  async cancelSubscription(id: string) {
    await this.request<unknown>("POST", "/subscriptions/cancel", { body: { id } });
  }
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export type AbacateWebhookEvent = {
  id: string;
  event: string;
  devMode?: boolean;
  data: unknown;
};

const encoder = new TextEncoder();

function timingSafeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

async function hmacSha256Base64(key: string, body: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Autenticidade do webhook:
 * 1. `?webhookSecret=` precisa bater com o segredo cadastrado (obrigatório);
 * 2. se `hmacKey` for informada, `X-Webhook-Signature` (HMAC-SHA256 base64 do
 *    corpo bruto) também é conferida.
 */
export async function verifyAbacateWebhook(input: {
  rawBody: string;
  querySecret: string | null;
  signature: string | null;
  secret: string | undefined;
  hmacKey?: string;
}): Promise<boolean> {
  if (!input.secret || !input.querySecret) return false;
  if (!timingSafeEqual(input.querySecret, input.secret)) return false;
  if (input.hmacKey) {
    if (!input.signature) return false;
    const expected = await hmacSha256Base64(input.hmacKey, input.rawBody);
    if (!timingSafeEqual(expected, input.signature)) return false;
  }
  return true;
}

/** Procura recursivamente o primeiro id com o prefixo dado (`pix_char_`, `subs_`, `bill_`). */
export function findIdWithPrefix(value: unknown, prefix: string, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (typeof value === "string") return value.startsWith(prefix) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findIdWithPrefix(item, prefix, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.id === "string" && record.id.startsWith(prefix)) return record.id;
    for (const nested of Object.values(record)) {
      const found = findIdWithPrefix(nested, prefix, depth + 1);
      if (found) return found;
    }
  }
  return null;
}
