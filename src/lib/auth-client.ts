"use client";

import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [phoneNumberClient()],
});

/** Mensagens do Better Auth traduzidas para o usuário. */
export function authErrorMessage(error: { message?: string; code?: string } | null | undefined): string {
  const code = error?.code ?? "";
  if (code.includes("INVALID_OTP")) return "Código incorreto. Confira e tente de novo.";
  if (code.includes("OTP_EXPIRED")) return "Código expirado. Peça um novo.";
  if (code.includes("TOO_MANY_ATTEMPTS")) return "Muitas tentativas. Peça um novo código.";
  if (code.includes("INVALID_PHONE_NUMBER")) return "Número inválido. Use DDD + número.";
  if (code.includes("PHONE_NUMBER_EXIST")) {
    return "Este WhatsApp já tem uma conta. Entre com ele e conecte o Google no Perfil.";
  }
  if (code.includes("TOO_MANY_REQUESTS") || error?.message?.includes("Too many")) {
    return "Muitas tentativas. Aguarde um minuto.";
  }
  return error?.message || "Não foi possível concluir. Tente novamente.";
}

const FIELD_ERROR_CODES = ["INVALID_OTP", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS", "INVALID_PHONE_NUMBER", "PHONE_NUMBER_EXIST"];

/**
 * Regra de feedback do login: erro do que a pessoa digitou (número, código)
 * aparece inline embaixo do campo; falha de serviço (WhatsApp fora do ar,
 * rede, limite de envios, Google) aparece em toast.
 */
export function isFieldAuthError(error: { code?: string } | null | undefined): boolean {
  const code = error?.code ?? "";
  return FIELD_ERROR_CODES.some((c) => code.includes(c));
}
