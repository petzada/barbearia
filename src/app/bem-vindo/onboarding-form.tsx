"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { maskBrazilPhoneInput, toE164BrazilPhone } from "@/lib/phone";
import { saveProfileAction } from "@/app/actions/perfil";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm({
  needsName,
  needsPhone,
  initialName,
}: {
  needsName: boolean;
  needsPhone: boolean;
  initialName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"name" | "phone" | "code">(needsName ? "name" : "phone");
  const [name, setName] = useState(initialName);
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = () => {
    router.replace("/entrar");
    router.refresh();
  };

  async function submitName(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await saveProfileAction({ fullName: name });
    setPending(false);
    if (!result.ok) return setError(result.error);
    if (needsPhone) setStep("phone");
    else finish();
  }

  async function submitPhone(event: React.FormEvent) {
    event.preventDefault();
    const e164 = toE164BrazilPhone(phoneInput);
    if (!e164) return setError("Informe seu WhatsApp com DDD.");
    setPending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.sendOtp({ phoneNumber: e164 });
    setPending(false);
    if (err) return setError(authErrorMessage(err));
    setPhone(e164);
    setStep("code");
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    if (!phone) return;
    setPending(true);
    setError(null);
    const { error: err } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code,
      updatePhoneNumber: true,
    });
    setPending(false);
    if (err) return setError(authErrorMessage(err));
    finish();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
          {step === "name" ? "Como podemos te chamar?" : step === "phone" ? "Qual é o seu WhatsApp?" : "Confirme o código"}
        </h1>
        <p className="text-[15px] text-ink-subtle">
          {step === "name"
            ? "Seu nome aparece para o barbeiro na agenda."
            : step === "phone"
              ? "Usamos para lembretes do seu horário e para você entrar sem senha."
              : "Digite os 6 números que enviamos no WhatsApp."}
        </p>
      </div>

      {step === "name" && (
        <form onSubmit={submitName} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Nome</Label>
            <Input
              id="fullName"
              autoComplete="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome e sobrenome"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Continuar"}
          </Button>
        </form>
      )}

      {step === "phone" && (
        <form onSubmit={submitPhone} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              autoFocus
              value={phoneInput}
              onChange={(e) => setPhoneInput(maskBrazilPhoneInput(e.target.value))}
              placeholder="(11) 98765-4321"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando…" : "Receber código"}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={submitCode} className="flex flex-col gap-4">
          <Input
            aria-label="Código de 6 números"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-14 text-center text-2xl font-bold tracking-[0.5em]"
          />
          <Button type="submit" disabled={pending || code.length !== 6}>
            {pending ? "Confirmando…" : "Confirmar"}
          </Button>
          <button type="button" className="text-sm font-semibold text-cta" onClick={() => setStep("phone")}>
            Trocar número
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
