"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { maskBrazilPhoneInput, toE164BrazilPhone, formatBrazilPhone } from "@/lib/phone";
import { getFirstName } from "@/lib/profile/display-name";
import { saveProfileAction } from "@/app/actions/perfil";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/auth/otp-input";
import { useResendCountdown } from "@/components/auth/use-resend-countdown";

type Step = "name" | "phone" | "code" | "done";

export function OnboardingFlow({
  needsName,
  needsPhone,
  initialName,
}: {
  needsName: boolean;
  needsPhone: boolean;
  initialName: string;
}) {
  const router = useRouter();
  const steps: Exclude<Step, "code" | "done">[] = [
    ...(needsName ? (["name"] as const) : []),
    ...(needsPhone ? (["phone"] as const) : []),
  ];
  const [step, setStep] = useState<Step>(steps[0]);
  const [name, setName] = useState(initialName);
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resend = useResendCountdown();

  const progressIndex = step === "code" ? steps.indexOf("phone") : steps.indexOf(step as "name" | "phone");

  function go(next: Step) {
    setError(null);
    setStep(next);
  }

  async function submitName() {
    setPending(true);
    setError(null);
    const result = await saveProfileAction({ fullName: name });
    setPending(false);
    if (!result.ok) return setError(result.error);
    go(needsPhone ? "phone" : "done");
  }

  async function sendCode(target: string) {
    setPending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.sendOtp({ phoneNumber: target });
    setPending(false);
    if (err) {
      setError(authErrorMessage(err));
      return false;
    }
    resend.start();
    return true;
  }

  async function submitPhone() {
    const e164 = toE164BrazilPhone(phoneInput);
    if (!e164) return setError("Informe seu WhatsApp com DDD.");
    if (await sendCode(e164)) {
      setPhone(e164);
      setCode("");
      go("code");
    }
  }

  async function verify(fullCode: string) {
    if (!phone || pending) return;
    setPending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code: fullCode,
      updatePhoneNumber: true,
    });
    setPending(false);
    if (err) {
      setCode("");
      return setError(authErrorMessage(err));
    }
    go("done");
  }

  if (step === "done") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center">
        <CheckCircle2 className="size-16 text-success" aria-hidden />
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
          Tudo pronto, {getFirstName(name || initialName)}!
        </h1>
        <p className="text-[15px] text-ink-subtle">Seu cadastro está completo. Bora marcar o primeiro corte?</p>
        <div className="mt-4 flex w-full flex-col gap-2">
          <Link href="/agendar" className={buttonVariants({ size: "lg", className: "w-full" })} onClick={() => router.refresh()}>
            Agendar meu primeiro horário
          </Link>
          <Link href="/entrar" className={buttonVariants({ size: "lg", variant: "ghost", className: "w-full" })}>
            Ir para o início
          </Link>
        </div>
      </main>
    );
  }

  const content = {
    name: {
      title: "Como podemos te chamar?",
      description: "Seu nome aparece para o barbeiro na agenda.",
      body: (
        <Input
          aria-label="Nome e sobrenome"
          autoComplete="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome e sobrenome"
          className="h-14 text-lg font-semibold"
        />
      ),
      action: { label: pending ? "Salvando…" : "Continuar", onClick: submitName, disabled: pending || name.trim().length < 2 },
    },
    phone: {
      title: "Qual é o seu WhatsApp?",
      description: "Usamos para lembretes do seu horário e para você entrar sem senha.",
      body: (
        <Input
          aria-label="WhatsApp com DDD"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus
          value={phoneInput}
          onChange={(e) => setPhoneInput(maskBrazilPhoneInput(e.target.value))}
          placeholder="(11) 98765-4321"
          className="h-14 text-lg font-semibold"
        />
      ),
      action: { label: pending ? "Enviando…" : "Receber código", onClick: submitPhone, disabled: pending },
    },
    code: {
      title: "Digite o código",
      description: `Enviamos 6 números para ${phone ? formatBrazilPhone(phone) : "seu WhatsApp"}.`,
      body: (
        <div className="flex flex-col gap-4">
          <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={pending} autoFocus invalid={Boolean(error)} />
          <p className="text-sm text-ink-subtle">
            Não chegou?{" "}
            {resend.seconds > 0 ? (
              <span className="tabular font-semibold">Reenviar em {resend.label}</span>
            ) : (
              <button type="button" className="font-bold text-cta" onClick={() => phone && sendCode(phone)}>
                Reenviar código
              </button>
            )}
          </p>
        </div>
      ),
      action: null,
    },
  }[step];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        {step === "code" ? (
          <button type="button" aria-label="Voltar" onClick={() => go("phone")} className="-ml-2 flex size-10 items-center justify-center text-cta">
            <ChevronLeft className="size-6" aria-hidden />
          </button>
        ) : null}
        <div className="flex flex-1 items-center gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s} className={i <= progressIndex ? "h-1.5 flex-1 rounded-full bg-cta" : "h-1.5 flex-1 rounded-full bg-hairline-strong"} />
          ))}
        </div>
        <span className="text-xs font-bold text-ink-subtle">
          {progressIndex + 1} de {steps.length}
        </span>
      </div>

      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (content.action && !content.action.disabled) void content.action.onClick();
        }}
      >
        <div className="flex flex-col gap-6 pt-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{content.title}</h1>
            <p className="text-[15px] text-ink-subtle">{content.description}</p>
          </div>
          {content.body}
          {error && (
            <p role="alert" className="-mt-2 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
        </div>
        {content.action && (
          <div className="sticky bottom-0 mt-auto bg-background pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            <Button type="submit" size="lg" className="w-full" disabled={content.action.disabled}>
              {content.action.label}
            </Button>
          </div>
        )}
      </form>
    </main>
  );
}
