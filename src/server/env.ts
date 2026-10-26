import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Variáveis de ambiente/segredos do Worker, com fallback para process.env. */
export type ServerEnv = {
  appBaseUrl: string;
  timezone: string;
  authSecret: string | undefined;
  adminPhoneNumbers: string[];
  googleClientId: string | undefined;
  googleClientSecret: string | undefined;
  whatsmiauBaseUrl: string;
  whatsmiauApiKey: string | undefined;
  whatsmiauWebhookSecret: string | undefined;
  abacatePayApiKey: string | undefined;
  /** Chave pública (`pk_…`) do abacatepay.js — mesmo ambiente (dev/produção) da API key. */
  abacatePayPublicKey: string | undefined;
  abacatePayWebhookSecret: string | undefined;
  /** Opcional: chave HMAC para conferir `X-Webhook-Signature`. */
  abacatePayWebhookHmacKey: string | undefined;
  cronSecret: string | undefined;
  /** Somente fora de produção: código de login fixo aceito e ecoado no log. */
  devOtp: string | undefined;
  isProduction: boolean;
};

type RawEnv = Record<string, unknown>;

const str = (raw: RawEnv, key: string): string | undefined => {
  const value = raw[key] ?? process.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export function parseServerEnv(raw: RawEnv): ServerEnv {
  const isProduction =
    (str(raw, "NEXTJS_ENV") ?? process.env.NODE_ENV) === "production";
  return {
    appBaseUrl: (str(raw, "APP_BASE_URL") ?? "http://localhost:3000").replace(/\/+$/, ""),
    timezone: str(raw, "APP_TIMEZONE") ?? "America/Sao_Paulo",
    authSecret: str(raw, "BETTER_AUTH_SECRET"),
    adminPhoneNumbers: (str(raw, "ADMIN_PHONE_NUMBERS") ?? "")
      .split(",")
      .map((p) => p.replace(/\D/g, ""))
      .filter(Boolean),
    googleClientId: str(raw, "GOOGLE_CLIENT_ID"),
    googleClientSecret: str(raw, "GOOGLE_CLIENT_SECRET"),
    whatsmiauBaseUrl: str(raw, "WHATSMIAU_BASE_URL") ?? "https://api.whatsmiau.dev",
    whatsmiauApiKey: str(raw, "WHATSMIAU_API_KEY"),
    whatsmiauWebhookSecret: str(raw, "WHATSMIAU_WEBHOOK_SECRET"),
    abacatePayApiKey: str(raw, "ABACATEPAY_API_KEY"),
    abacatePayPublicKey: str(raw, "ABACATEPAY_PUBLIC_KEY"),
    abacatePayWebhookSecret: str(raw, "ABACATEPAY_WEBHOOK_SECRET"),
    abacatePayWebhookHmacKey: str(raw, "ABACATEPAY_WEBHOOK_HMAC_KEY"),
    cronSecret: str(raw, "CRON_SECRET"),
    devOtp: isProduction ? undefined : str(raw, "AUTH_DEV_OTP"),
    isProduction,
  };
}

export async function getServerEnv(): Promise<ServerEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return parseServerEnv(env as unknown as RawEnv);
}
