import { describe, expect, it, vi } from "vitest";
import { AbacatePayClient, AbacatePayError, findIdWithPrefix, sanitizeAbacateText, verifyAbacateWebhook } from "./abacatepay";

describe("AbacatePayClient", () => {
  it("envia Bearer + corpo da v2 e desembrulha o envelope", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: { id: "pix_char_1", status: "PENDING" }, error: null, success: true })),
    );
    const client = new AbacatePayClient("key_dev", "https://api.test/v2", fetchImpl as unknown as typeof fetch);
    const res = await client.createPixCharge({ amountCents: 4500, description: "x", expiresInSeconds: 1800, externalId: "p1" });
    expect(res.id).toBe("pix_char_1");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://api.test/v2/transparents/create");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key_dev");
    expect(JSON.parse(String(init.body))).toMatchObject({ method: "PIX", data: { amount: 4500, expiresIn: 1800, externalId: "p1" } });
  });

  it("cobra o cartão com token OU cardToken, cliente completo e só metadata", async () => {
    const charge = { id: "card_1", status: "APPROVED", cardToken: "tok_perm", brand: "VISA", lastFour: "4242" };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: charge, error: null })));
    const client = new AbacatePayClient("k", "https://api.test/v2", fetchImpl as unknown as typeof fetch);
    const customer = { name: "Ana — Souza", email: "a@b.com", taxId: "52998224725", cellphone: "(11) 96000-1234" };
    const res = await client.createCardCharge({ amountCents: 19990, token: "ctok_1", customer, metadata: { paymentId: "p1" } });
    expect(res.cardToken).toBe("tok_perm");
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [URL, RequestInit])[1].body));
    expect(body).toEqual({
      method: "CARD",
      data: {
        amount: 19990,
        token: "ctok_1",
        customer: { ...customer, name: "Ana - Souza" },
        metadata: { paymentId: "p1" },
      },
    });
    await client.createCardCharge({ amountCents: 19990, cardToken: "tok_perm", customer, metadata: {} });
    const renewal = JSON.parse(String((fetchImpl.mock.calls[1] as unknown as [URL, RequestInit])[1].body));
    expect(renewal.data).toMatchObject({ cardToken: "tok_perm" });
    expect(renewal.data.token).toBeUndefined();
    expect(() => client.createCardCharge({ amountCents: 1, customer, metadata: {} })).toThrow(/exatamente um/);
  });

  it("consulta, lista e estorna cobranças do checkout transparente", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: [], error: null })));
    const client = new AbacatePayClient("k", "https://api.test/v2", fetchImpl as unknown as typeof fetch);
    await client.getCardCharge("card_1");
    await client.listCardCharges();
    await client.refund("card_1", "Estorno — pedido");
    const calls = fetchImpl.mock.calls as unknown as [URL, RequestInit][];
    expect(String(calls[0][0])).toBe("https://api.test/v2/transparents/get?id=card_1");
    expect(String(calls[1][0])).toBe("https://api.test/v2/transparents/list?method=CARD&limit=100");
    expect(String(calls[2][0])).toBe("https://api.test/v2/transparents/refund");
    expect(JSON.parse(String(calls[2][1].body))).toEqual({ id: "card_1", reason: "Estorno - pedido" });
  });

  it("converte erro do envelope em AbacatePayError", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: null, error: "Insufficient permissions" }), { status: 403 }));
    const client = new AbacatePayClient("k", "https://api.test/v2", fetchImpl as unknown as typeof fetch);
    await expect(client.checkPixCharge("x")).rejects.toBeInstanceOf(AbacatePayError);
  });
});

describe("verifyAbacateWebhook", () => {
  it("exige o segredo na query", async () => {
    const base = { rawBody: "{}", signature: null, secret: "s3cret" };
    expect(await verifyAbacateWebhook({ ...base, querySecret: "s3cret" })).toBe(true);
    expect(await verifyAbacateWebhook({ ...base, querySecret: "errado" })).toBe(false);
    expect(await verifyAbacateWebhook({ ...base, querySecret: null })).toBe(false);
    expect(await verifyAbacateWebhook({ ...base, secret: undefined, querySecret: "x" })).toBe(false);
  });

  it("confere HMAC-SHA256 do corpo quando a chave é configurada", async () => {
    const body = '{"id":"log_1"}';
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("pub"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))));
    const base = { rawBody: body, querySecret: "s", secret: "s", hmacKey: "pub" };
    expect(await verifyAbacateWebhook({ ...base, signature: sig })).toBe(true);
    expect(await verifyAbacateWebhook({ ...base, signature: "forjada" })).toBe(false);
    expect(await verifyAbacateWebhook({ ...base, rawBody: '{"id":"log_2"}', signature: sig })).toBe(false);
  });
});

describe("findIdWithPrefix", () => {
  it("acha ids em payloads com formatos diferentes", () => {
    expect(findIdWithPrefix({ data: { pixQrCode: { id: "pix_char_9" } } }, "pix_char_")).toBe("pix_char_9");
    expect(findIdWithPrefix({ data: { transparent: { id: "card_2", customer: { id: "cust_1" } } } }, "card_")).toBe("card_2");
    expect(findIdWithPrefix({ a: [1, { b: "card_7" }] }, "card_")).toBe("card_7");
    expect(findIdWithPrefix({ a: "x" }, "card_")).toBeNull();
  });
});

describe("sanitizeAbacateText", () => {
  it("troca caracteres que a API recusa (travessão, aspas curvas, reticências)", () => {
    expect(sanitizeAbacateText("Barbearia do Moura — agendamento")).toBe("Barbearia do Moura - agendamento");
    expect(sanitizeAbacateText("Corte “degradê” – 30 min…")).toBe('Corte "degradê" - 30 min...');
    expect(sanitizeAbacateText("Clube\u00a0Premium")).toBe("Clube Premium");
  });

  it("é aplicado na descrição enviada ao criar o Pix", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: { id: "pix_char_1", status: "PENDING" }, error: null })),
    );
    const client = new AbacatePayClient("k", "https://api.test/v2", fetchImpl as unknown as typeof fetch);
    await client.createPixCharge({ amountCents: 100, description: "A — B", expiresInSeconds: 1800, externalId: "p" });
    const init = (fetchImpl.mock.calls[0] as unknown as [URL, RequestInit])[1];
    expect(JSON.parse(String(init.body)).data.description).toBe("A - B");
  });
});
