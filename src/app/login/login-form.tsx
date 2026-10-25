"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { authClient, authErrorMessage, isFieldAuthError } from "@/lib/auth-client";
import { formatBrazilPhone, maskBrazilPhoneInput, toE164BrazilPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/auth/otp-input";
import { GoogleIcon } from "@/components/google-icon";
import { useResendCountdown } from "@/components/auth/use-resend-countdown";
import { ResendCode } from "@/components/auth/resend-code";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [step, setStepState] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resend = useResendCountdown();

  const setStep = (next: "phone" | "code") => {
    setError(null);
    setStepState(next);
  };

  async function sendCode(target: string) {
    setPending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.sendOtp({ phoneNumber: target });
    setPending(false);
    if (err) {
      // Campo (número inválido) → inline; serviço (WhatsApp/rede/limite) → toast.
      if (isFieldAuthError(err)) setError(authErrorMessage(err));
      else toast.error(authErrorMessage(err));
      return false;
    }
    resend.start();
    return true;
  }

  async function submitPhone(event: React.FormEvent) {
    event.preventDefault();
    const e164 = toE164BrazilPhone(phoneInput);
    if (!e164) return setError("Informe seu WhatsApp com DDD, ex.: (11) 98765-4321.");
    if (await sendCode(e164)) {
      setPhone(e164);
      setCode("");
      setStep("code");
    }
  }

  async function verify(fullCode: string) {
    if (!phone || pending) return;
    setPending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.verify({ phoneNumber: phone, code: fullCode });
    if (err) {
      setPending(false);
      setCode("");
      if (isFieldAuthError(err)) setError(authErrorMessage(err));
      else toast.error(authErrorMessage(err));
      return;
    }
    // Navegação completa: /entrar decide o destino pela sessão recém-criada
    // e nada do cache do roteador (anterior ao login) é reaproveitado.
    window.location.replace("/entrar");
  }

  async function google() {
    setPending(true);
    const { error: err } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/entrar",
      errorCallbackURL: "/login",
    });
    if (err) {
      setPending(false);
      toast.error(authErrorMessage(err));
    }
  }

  if (step === "code") {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <button
          type="button"
          onClick={() => setStep("phone")}
          className="-ml-2 inline-flex h-11 w-fit items-center gap-1 rounded-md pl-1 pr-3 text-sm font-semibold text-cta-ink"
        >
          <ChevronLeft className="size-5" aria-hidden />
          Trocar número
        </button>
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Digite o código</h1>
          <p className="text-[15px] text-ink-subtle">
            Enviado para o WhatsApp <strong className="text-ink">{phone ? formatBrazilPhone(phone) : ""}</strong>
          </p>
        </div>
        <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={pending} autoFocus invalid={Boolean(error)} />
        {error && (
          <p role="alert" className="-mt-2 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
        {pending && <p className="text-sm text-ink-subtle">Entrando…</p>}
        <ResendCode
          seconds={resend.seconds}
          label={resend.label}
          disabled={pending}
          onResend={() => phone && sendCode(phone)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Entrar</h1>
        <p className="text-[15px] text-ink-subtle">Enviamos um código no seu WhatsApp. Sem senha.</p>
      </div>
      <form onSubmit={submitPhone} className="flex flex-col gap-3" noValidate>
        <label htmlFor="phone" className="text-sm font-bold">
          WhatsApp
        </label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(11) 98765-4321"
          value={phoneInput}
          onChange={(e) => setPhoneInput(maskBrazilPhoneInput(e.target.value))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
          className="h-14 text-lg font-semibold"
        />
        {error && (
          <p id="login-error" role="alert" className="text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          <MessageCircle aria-hidden />
          {pending ? "Enviando…" : "Receber código no WhatsApp"}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-ink-tertiary">
            <span className="h-px flex-1 bg-hairline" />
            ou
            <span className="h-px flex-1 bg-hairline" />
          </div>
          <Button variant="outline" size="lg" className="w-full" disabled={pending} onClick={google}>
            <GoogleIcon className="size-5" />
            Continuar com Google
          </Button>
        </>
      )}

      <p className="text-center text-xs leading-relaxed text-ink-subtle">
        Ao entrar você concorda com os{" "}
        <Link href="/termos" className="font-semibold text-ink underline-offset-2 hover:underline">
          Termos de uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="font-semibold text-ink underline-offset-2 hover:underline">
          Política de privacidade
        </Link>
        .
      </p>
    </div>
  );
}
