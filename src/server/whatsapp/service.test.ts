import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { createAdmin, createBarber, createUser, sp } from "@/test/factories";
import { parseServerEnv } from "../env";
import { whatsappConfig, whatsappLogs } from "../db/schema";
import { createAppointment } from "../scheduling";
import {
  applyConnectionWebhook,
  createInstance,
  runDailyReminders,
  sendLoginCode,
  sendTestMessage,
  type WhatsappGateway,
} from "./service";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

function fakeGateway(overrides: Partial<WhatsappGateway> = {}) {
  return {
    sendText: vi.fn(async () => ({ key: { id: "msg-1" } })),
    createInstance: vi.fn(async () => ({ instance: { instanceId: "inst-1" } })),
    connectInstance: vi.fn(async () => ({ base64: "data:image/png;base64,QR" })),
    deleteInstance: vi.fn(async () => ({})),
    listInstances: vi.fn(async () => [{ instanceId: "inst-1", status: "open" }]),
    ...overrides,
  } satisfies WhatsappGateway;
}

const prodEnv = parseServerEnv({ NEXTJS_ENV: "production", WHATSMIAU_API_KEY: "k", AUTH_DEV_OTP: "123456" });
const connect = () =>
  t.db.update(whatsappConfig).set({ instanceId: "inst-1", status: "connected" }).where(eq(whatsappConfig.id, 1));

describe("código de login", () => {
  it("envia pelo WhatsApp sem gravar o código no log", async () => {
    await connect();
    const gw = fakeGateway();
    await sendLoginCode(t.db, prodEnv, gw, "+5511960234545", "482913");
    expect(gw.sendText).toHaveBeenCalledWith("inst-1", "5511960234545", expect.stringContaining("482913"));
    const [log] = await t.db.select().from(whatsappLogs);
    expect(log).toMatchObject({ kind: "otp", status: "sent", toPhone: "5511960234545" });
    expect(log.message).not.toContain("482913");
  });

  it("AUTH_DEV_OTP é ignorado em produção", () => {
    expect(prodEnv.devOtp).toBeUndefined();
    expect(parseServerEnv({ NEXTJS_ENV: "development", AUTH_DEV_OTP: "123456" }).devOtp).toBe("123456");
  });

  it("limita 3 códigos por número a cada 10 minutos", async () => {
    await connect();
    const gw = fakeGateway();
    for (let i = 0; i < 3; i++) await sendLoginCode(t.db, prodEnv, gw, "+5511960234545", "111111");
    await expect(sendLoginCode(t.db, prodEnv, gw, "+5511960234545", "111111")).rejects.toThrow(/Muitos códigos/);
  });

  it("falha clara quando a instância não está configurada ou o envio falha", async () => {
    await expect(sendLoginCode(t.db, prodEnv, fakeGateway(), "+5511960234545", "1")).rejects.toMatchObject({ code: "provider" });
    await connect();
    const failing = fakeGateway({ sendText: vi.fn(async () => { throw new Error("offline"); }) });
    await expect(sendLoginCode(t.db, prodEnv, failing, "+5511960234546", "1")).rejects.toThrow(/Google/);
    const logs = await t.db.select().from(whatsappLogs);
    expect(logs.map((l) => l.status).sort()).toEqual(["failed", "failed"]);
  });
});

describe("instância e webhook", () => {
  it("cria instância guardando QR e só admin pode", async () => {
    const admin = await createAdmin(t.db);
    const barber = await createBarber(t.db);
    await expect(createInstance(t.db, barber, fakeGateway())).rejects.toMatchObject({ code: "forbidden" });
    const config = await createInstance(t.db, admin, fakeGateway());
    expect(config).toMatchObject({ instanceId: "inst-1", status: "qr_required", qrCode: "data:image/png;base64,QR" });
  });

  it("connection.update conectado limpa o QR e grava o número", async () => {
    await t.db.update(whatsappConfig).set({ instanceId: "inst-1", status: "qr_required", qrCode: "x" }).where(eq(whatsappConfig.id, 1));
    const applied = await applyConnectionWebhook(t.db, {
      event: "connection.update",
      instance: "inst-1",
      data: { state: "open", me: { id: "5511960234545@s.whatsapp.net" } },
    });
    expect(applied).toBe(true);
    const config = await t.db.query.whatsappConfig.findFirst();
    expect(config).toMatchObject({ status: "connected", qrCode: null, phoneConnected: "5511960234545" });
    expect(await applyConnectionWebhook(t.db, { event: "messages.upsert" })).toBe(false);
  });

  it("mensagem de teste registra log", async () => {
    await connect();
    const admin = await createAdmin(t.db);
    await sendTestMessage(t.db, admin, fakeGateway(), "(11) 96023-4545");
    const [log] = await t.db.select().from(whatsappLogs);
    expect(log).toMatchObject({ kind: "test", status: "sent" });
  });
});

describe("lembretes diários", () => {
  it("envia uma vez por agendamento do dia (idempotente)", async () => {
    await connect();
    const barber = await createBarber(t.db, { name: "Moura" });
    const client = await createUser(t.db, { name: "João Silva", phoneNumber: "+5511960234545" });
    const day = "2026-11-02";
    await createAppointment(
      t.db, client,
      { barberId: barber.id, serviceId: "svc-corte", startsAt: sp(day, "15:00").getTime(), paymentChoice: "local" },
      sp("2026-11-01", "10:00"),
    );
    const gw = fakeGateway();
    const morning = sp(day, "08:00");
    const first = await runDailyReminders(t.db, gw, morning);
    expect(first).toMatchObject({ found: 1, sent: 1 });
    expect(vi.mocked(gw.sendText).mock.calls[0][2]).toContain("Olá, João!");
    expect(vi.mocked(gw.sendText).mock.calls[0][2]).toContain("15:00");
    expect(vi.mocked(gw.sendText).mock.calls[0][2]).toContain("Moura");

    const second = await runDailyReminders(t.db, gw, morning);
    expect(second).toMatchObject({ found: 1, sent: 0, alreadySent: 1 });
    expect(gw.sendText).toHaveBeenCalledTimes(1);
  });

  it("não envia quando desativado pelo admin", async () => {
    await t.db.update(whatsappConfig).set({ remindersEnabled: false }).where(eq(whatsappConfig.id, 1));
    const summary = await runDailyReminders(t.db, null, sp("2026-11-02", "08:00"));
    expect(summary.found).toBe(0);
  });
});
