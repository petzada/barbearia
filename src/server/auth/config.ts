import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { account, rateLimit, session, user, verification } from "../db/schema";
import type { ServerEnv } from "../env";
import { DomainError } from "../errors";
import { sendLoginCode, type WhatsappGateway } from "../whatsapp/service";
import { isE164BrazilPhone } from "@/lib/phone";
import { applyTeamInvite } from "../team";

/** E-mail técnico para contas criadas por telefone (o Better Auth exige e-mail). */
export const phoneTempEmail = (phone: string) =>
  `${phone.replace(/\D/g, "")}@telefone.barbeariadomoura.app`;

export const isPhoneTempEmail = (email: string) =>
  email.endsWith("@telefone.barbeariadomoura.app");

export const PHONE_SIGNUP_NAME = "Cliente";

export type AuthDeps = {
  db: Db;
  env: ServerEnv;
  gateway: WhatsappGateway | null;
  /** Plugins extras (ex.: `nextCookies()` dentro do Next). */
  withNextCookies?: boolean;
};

export function createAuth({ db, env, gateway, withNextCookies = true }: AuthDeps) {
  const devOtp = env.devOtp;

  return betterAuth({
    appName: "Barbearia do Moura",
    baseURL: env.appBaseUrl,
    secret: env.authSecret ?? (env.isProduction ? undefined : "dev-secret-barbearia-do-moura-local-only"),
    trustedOrigins: [env.appBaseUrl],
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { user, session, account, verification, rateLimit },
    }),
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
    },
    // Sem e-mail e senha: login principal por código no WhatsApp, secundário Google.
    emailAndPassword: { enabled: false },
    socialProviders:
      env.googleClientId && env.googleClientSecret
        ? {
            google: {
              clientId: env.googleClientId,
              clientSecret: env.googleClientSecret,
              prompt: "select_account",
            },
          }
        : {},
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 60, // 60 dias
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: env.isProduction,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/phone-number/send-otp": { window: 60, max: 3 },
        "/phone-number/verify": { window: 60, max: 10 },
      },
    },
    user: {
      additionalFields: {
        // input: false — nunca aceitos do cliente (sem auto-promoção).
        isBarber: { type: "boolean", required: false, defaultValue: false, input: false },
        isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
        acceptingBookings: { type: "boolean", required: false, defaultValue: true, input: false },
        commissionPercent: { type: "number", required: false, defaultValue: 0, input: false },
        profileCompleted: { type: "boolean", required: false, defaultValue: false, input: false },
        whatsappReminders: { type: "boolean", required: false, defaultValue: true, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          // Conta criada pelo Google já chega com nome real.
          before: async (data) => ({
            data: { ...data, profileCompleted: data.name !== PHONE_SIGNUP_NAME },
          }),
        },
      },
    },
    plugins: [
      phoneNumber({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 5,
        phoneNumberValidator: (value) => isE164BrazilPhone(value),
        sendOTP: async ({ phoneNumber: phone, code }) => {
          try {
            await sendLoginCode(db, env, gateway, phone, code);
          } catch (error) {
            if (error instanceof DomainError) {
              throw new APIError("BAD_REQUEST", { message: error.message });
            }
            throw error;
          }
        },
        // Somente fora de produção (env.devOtp é undefined em produção).
        verifyOTP: devOtp ? ({ code }) => code === devOtp : undefined,
        signUpOnVerification: {
          getTempEmail: phoneTempEmail,
          getTempName: () => PHONE_SIGNUP_NAME,
        },
        callbackOnVerification: async ({ phoneNumber: phone, user: verified }) => {
          // Bootstrap da gestão: telefones de ADMIN_PHONE_NUMBERS viram admin + barbeiro.
          const digits = phone.replace(/\D/g, "");
          if (env.adminPhoneNumbers.includes(digits)) {
            await db
              .update(user)
              .set({ isAdmin: true, isBarber: true })
              .where(eq(user.id, verified.id));
          }
          // Convite da equipe feito pelo admin antes da pessoa ter conta.
          await applyTeamInvite(db, verified.id, phone);
        },
      }),
      ...(withNextCookies ? [nextCookies()] : []),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
