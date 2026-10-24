"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { formatBrazilPhone, maskBrazilPhoneInput, toE164BrazilPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import { cn } from "@/lib/utils";

const RESEND_SECONDS = 60;

const fieldClass =
  "h-14 w-full rounded-md border-0 bg-white/10 px-4 text-lg font-semibold text-white outline-none ring-1 ring-white/15 transition placeholder:font-medium placeholder:text-white/40 focus:ring-2 focus:ring-cta";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  async function sendCode(target: string) {
    setPending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.sendOtp({ phoneNumber: target });
    setPending(false);
    if (err) {
      setError(authErrorMessage(err));
      return false;
    }
    setResendIn(RESEND_SECONDS);
    return true;
  }

  async function handlePhoneSubmit(event: React.FormEvent) {
    event.preventDefault();
    const e164 = toE164BrazilPhone(phoneInput);
    if (!e164) {
      setError("Informe seu WhatsApp com DDD, ex.: (11) 98765-4321.");
      return;
    }
    if (await sendCode(e164)) {
      setPhone(e164);
      setCode("");
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 50);
    }
  }

  async function handleCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!phone || code.length !== 6) {
      setError("Digite os 6 números do código.");
      return;
    }
    setPending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.verify({ phoneNumber: phone, code });
    if (err) {
      setPending(false);
      setError(authErrorMessage(err));
      return;
    }
    router.replace("/entrar");
    router.refresh();
  }

  async function handleGoogle() {
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

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 text-white">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight">
          {step === "phone" ? "Entrar" : "Digite o código"}
        </h1>
        <p className="text-[15px] text-white/70">
          {step === "phone"
            ? "Use seu WhatsApp. Enviamos um código de acesso, sem senha."
            : `Enviamos 6 números para o WhatsApp ${phone ? formatBrazilPhone(phone) : ""}.`}
        </p>
      </div>

      {step === "phone" ? (
        <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-3" noValidate>
          <label htmlFor="phone" className="sr-only">
            WhatsApp com DDD
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 98765-4321"
            value={phoneInput}
            onChange={(e) => setPhoneInput(maskBrazilPhoneInput(e.target.value))}
            className={fieldClass}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
          />
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            <MessageCircle aria-hidden />
            {pending ? "Enviando…" : "Receber código no WhatsApp"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit} className="flex flex-col gap-3" noValidate>
          <label htmlFor="code" className="sr-only">
            Código de 6 números
          </label>
          <input
            ref={codeRef}
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={cn(fieldClass, "text-center text-2xl tracking-[0.5em]")}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
          />
          <Button type="submit" size="lg" disabled={pending || code.length !== 6} className="w-full">
            {pending ? "Entrando…" : "Entrar"}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="font-semibold text-white/70 hover:text-white"
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
            >
              Trocar número
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || pending}
              className="font-semibold text-cta disabled:text-white/40"
              onClick={() => phone && sendCode(phone)}
            >
              {resendIn > 0 ? `Reenviar em ${resendIn}s` : "Reenviar código"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p id="login-error" role="alert" className="-mt-2 text-center text-sm font-semibold text-red-300">
          {error}
        </p>
      )}

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            <span className="h-px flex-1 bg-white/15" />
            ou
            <span className="h-px flex-1 bg-white/15" />
          </div>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={pending}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-md bg-white text-[15px] font-semibold text-ink transition hover:bg-white/90 disabled:opacity-60"
          >
            <GoogleIcon className="size-5" />
            Continuar com Google
          </button>
        </>
      )}

      <p className="text-center text-xs leading-relaxed text-white/50">
        Ao entrar você concorda com os{" "}
        <Link href="/termos" className="font-semibold text-white/80 underline-offset-2 hover:underline">
          Termos de uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="font-semibold text-white/80 underline-offset-2 hover:underline">
          Política de privacidade
        </Link>
        .
      </p>
    </div>
  );
}
