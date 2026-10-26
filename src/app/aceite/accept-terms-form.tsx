"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { acceptTermsAction } from "@/app/actions/perfil";
import { TermsConsent } from "@/components/legal/terms-consent";
import { Button } from "@/components/ui/button";

export function AcceptTermsForm() {
  const [checked, setChecked] = useState(false);
  const [tried, setTried] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-1 flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!checked) return;
        startTransition(async () => {
          const result = await acceptTermsAction(true);
          if (!result.ok) return void toast.error(result.error);
          // /entrar decide o destino pela sessão: navegação completa.
          window.location.replace(new URL("/entrar", window.location.origin));
        });
      }}
    >
      <TermsConsent checked={checked} onCheckedChange={setChecked} invalid={tried} />
      <div className="sticky bottom-0 mt-auto bg-background pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        <Button type="submit" size="lg" className="w-full" disabled={pending || !checked}>
          {pending ? "Salvando…" : "Aceitar e continuar"}
        </Button>
      </div>
    </form>
  );
}
