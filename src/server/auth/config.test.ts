import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { parseServerEnv } from "../env";
import { user, whatsappConfig } from "../db/schema";
import type { WhatsappGateway } from "../whatsapp/service";
import { createAuth, phoneTempEmail } from "./config";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(async () => {
  await t.reset();
  await t.db.update(whatsappConfig).set({ instanceId: "inst-1", status: "connected" }).where(eq(whatsappConfig.id, 1));
});
afterAll(() => t.dispose());

const PHONE = "+5511960234545";

function setup(envOverrides: Record<string, string> = {}) {
  const sent: string[] = [];
  const gateway = {
    sendText: vi.fn(async (_instance: string, _to: string, text: string) => {
      sent.push(text);
      return { key: { id: "m" } };
    }),
    createInstance: vi.fn(),
    connectInstance: vi.fn(),
    deleteInstance: vi.fn(),
    listInstances: vi.fn(),
  } as unknown as WhatsappGateway;
  const env = parseServerEnv({
    NEXTJS_ENV: "production",
    APP_BASE_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "test-secret-with-more-than-32-characters!!",
    WHATSMIAU_API_KEY: "k",
    ADMIN_PHONE_NUMBERS: "5511999990000",
    ...envOverrides,
  });
  const auth = createAuth({ db: t.db, env, gateway, withNextCookies: false });
  const lastCode = () => sent.at(-1)!.match(/^(\d{6})/)![1];
  return { auth, gateway, lastCode };
}

describe("login por código no WhatsApp", () => {
  it("cria a conta na primeira verificação e reaproveita nas próximas", async () => {
    const { auth, lastCode } = setup();
    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: PHONE } });
    const first = await auth.api.verifyPhoneNumber({ body: { phoneNumber: PHONE, code: lastCode() } });
    expect(first.status).toBe(true);
    expect(first.token).toBeTruthy();

    const [created] = await t.db.select().from(user);
    expect(created).toMatchObject({
      phoneNumber: PHONE,
      phoneNumberVerified: true,
      email: phoneTempEmail(PHONE),
      name: "Cliente",
      profileCompleted: false,
      isAdmin: false,
      isBarber: false,
    });

    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: PHONE } });
    const second = await auth.api.verifyPhoneNumber({ body: { phoneNumber: PHONE, code: lastCode() } });
    expect(second.user.id).toBe(created.id);
    expect(await t.db.select().from(user)).toHaveLength(1);
  });

  it("rejeita código errado e número fora do formato", async () => {
    const { auth } = setup();
    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: PHONE } });
    await expect(
      auth.api.verifyPhoneNumber({ body: { phoneNumber: PHONE, code: "000000" } }),
    ).rejects.toThrow();
    await expect(auth.api.sendPhoneNumberOTP({ body: { phoneNumber: "11960234545" } })).rejects.toThrow();
  });

  it("não aceita auto-promoção via corpo da requisição", async () => {
    const { auth, lastCode } = setup();
    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: PHONE } });
    const res = await auth.api.verifyPhoneNumber({
      body: { phoneNumber: PHONE, code: lastCode(), isAdmin: true, isBarber: true } as never,
    });
    expect(res.status).toBe(true);
    const rows = await t.db.select().from(user);
    expect(rows.every((r) => !r.isAdmin && !r.isBarber)).toBe(true);
  });

  it("telefones de ADMIN_PHONE_NUMBERS viram admin + barbeiro", async () => {
    const { auth, lastCode } = setup();
    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: "+5511999990000" } });
    await auth.api.verifyPhoneNumber({ body: { phoneNumber: "+5511999990000", code: lastCode() } });
    const [admin] = await t.db.select().from(user);
    expect(admin).toMatchObject({ isAdmin: true, isBarber: true });
  });

  it("devolve erro amigável quando o WhatsApp falha", async () => {
    const { auth, gateway } = setup();
    vi.mocked(gateway.sendText).mockRejectedValueOnce(new Error("offline"));
    await expect(auth.api.sendPhoneNumberOTP({ body: { phoneNumber: PHONE } })).rejects.toThrow(/Google/);
  });

  it("em desenvolvimento aceita o código fixo AUTH_DEV_OTP e não chama o WhatsApp", async () => {
    const { auth, gateway } = setup({ NEXTJS_ENV: "development", AUTH_DEV_OTP: "123456" });
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: PHONE } });
    expect(gateway.sendText).not.toHaveBeenCalled();
    const res = await auth.api.verifyPhoneNumber({ body: { phoneNumber: PHONE, code: "123456" } });
    expect(res.status).toBe(true);
    info.mockRestore();
  });
});
