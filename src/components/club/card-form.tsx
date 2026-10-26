"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Script from "next/script";
import { CreditCard, LoaderCircle } from "lucide-react";

/**
 * Formulário de cartão do checkout transparente do AbacatePay
 * (https://abacatepay.com/abacatepay.js). Os dados do cartão ficam no iframe
 * do AbacatePay; aqui só recebemos o token `ctok_` (uso único, 60 s).
 */

export const ABACATEPAY_SCRIPT_URL = "https://abacatepay.com/abacatepay.js";

export type CardPayer = { name: string; email: string; taxId: string; cellphone: string };
export type CardTokenResult = { token: string; brand: string | null; lastFour: string | null };

type AbacateCheckout = {
  mount(selector: string): Promise<void>;
  tokenize(payer: CardPayer): Promise<{ token: string; brand?: string; lastFour?: string }>;
  destroy?: () => void;
  unmount?: () => void;
};

declare global {
  interface Window {
    AbacatePay?: {
      create(options: {
        publicKey: string;
        amount: number;
        locale?: string;
        theme?: "light" | "dark";
        onCardChange?: (card: { brand?: string; complete?: boolean }) => void;
      }): AbacateCheckout;
    };
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  THREE_DS_FAILED: "O banco não confirmou a verificação de segurança. Tente de novo ou use outro cartão.",
  CARD_INVALID: "Cartão inválido. Confira número, validade e código.",
  CARD_INCOMPLETE: "Preencha todos os dados do cartão.",
  PAYER_INVALID: "Confira o CPF e o e-mail informados.",
};

/** Mensagem pt-BR para os erros do abacatepay.js (têm `code`). */
export function cardErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  return ERROR_MESSAGES[code] ?? "Não foi possível validar o cartão. Confira os dados e tente de novo.";
}

/** Controle exposto ao formulário pai (tokenizar no envio). */
export type CardFormHandle = { tokenize(payer: CardPayer): Promise<CardTokenResult> };

export function CardForm({
  publicKey,
  amountCents,
  handleRef,
  onReadyChange,
  containerId = "abacatepay-card",
}: {
  publicKey: string;
  amountCents: number;
  handleRef: RefObject<CardFormHandle | null>;
  onReadyChange?: (ready: boolean) => void;
  containerId?: string;
}) {
  const checkoutRef = useRef<AbacateCheckout | null>(null);
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && Boolean(window.AbacatePay));
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!scriptReady || !window.AbacatePay) return;
    let cancelled = false;
    const checkout = window.AbacatePay.create({ publicKey, amount: amountCents, locale: "pt-BR", theme: "light" });
    checkoutRef.current = checkout;
    checkout
      .mount(`#${containerId}`)
      .then(() => {
        if (cancelled) return;
        setState("ready");
        onReadyChange?.(true);
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
        onReadyChange?.(false);
      });
    handleRef.current = {
      async tokenize(payer) {
        if (!checkoutRef.current) throw new Error("Formulário do cartão indisponível.");
        const result = await checkoutRef.current.tokenize(payer);
        return { token: result.token, brand: result.brand ?? null, lastFour: result.lastFour ?? null };
      },
    };
    return () => {
      cancelled = true;
      handleRef.current = null;
      onReadyChange?.(false);
      (checkout.destroy ?? checkout.unmount)?.call(checkout);
    };
  }, [scriptReady, publicKey, amountCents, containerId, handleRef, onReadyChange]);

  return (
    <div className="flex flex-col gap-2">
      <Script
        src={ABACATEPAY_SCRIPT_URL}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setState("error")}
      />
      <div id={containerId} data-testid="abacatepay-card" className="min-h-40 rounded-lg bg-card p-4 shadow-card" />
      {state === "loading" && (
        <p className="flex items-center gap-2 text-sm text-ink-subtle" aria-live="polite">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Carregando formulário seguro do cartão…
        </p>
      )}
      {state === "error" && (
        <p className="flex items-center gap-2 text-sm font-semibold text-destructive" role="alert">
          <CreditCard className="size-4" aria-hidden />
          Não foi possível carregar o formulário do cartão. Recarregue a página ou pague com Pix.
        </p>
      )}
    </div>
  );
}
