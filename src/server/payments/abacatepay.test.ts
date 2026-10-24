import { describe, expect, it, vi } from "vitest";
import { AbacatePayClient, AbacatePayError, findIdWithPrefix, verifyAbacateWebhook } from "./abacatepay";

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
    expect(findIdWithPrefix({ subscription: { id: "subs_1", checkoutId: "bill_2" } }, "bill_")).toBe("bill_2");
    expect(findIdWithPrefix({ a: [1, { b: "subs_7" }] }, "subs_")).toBe("subs_7");
    expect(findIdWithPrefix({ a: "x" }, "subs_")).toBeNull();
  });
});
