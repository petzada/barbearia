import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { hasAcceptedCurrentTerms } from "@/server/terms";
import { LEGAL_UPDATED_AT } from "@/content/legal";
import { BrandMark } from "@/components/brand-mark";
import { AcceptTermsForm } from "./accept-terms-form";

export const metadata: Metadata = { title: "Termos atualizados" };

/** Novo aceite quando a versão dos Termos/Política muda. */
export default async function AceitePage() {
  const user = await requireUser();
  if (!user.profileCompleted || !user.phoneNumberVerified) redirect("/bem-vindo");
  if (hasAcceptedCurrentTerms(user)) redirect("/entrar");
  const firstAccept = !user.termsVersion;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <BrandMark />
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
          {firstAccept ? "Antes de continuar" : "Atualizamos nossos termos"}
        </h1>
        <p className="text-[15px] text-ink-subtle">
          {firstAccept
            ? "Confira os Termos de Uso e a Política de Privacidade da Barbearia do Moura."
            : `Os Termos de Uso e a Política de Privacidade mudaram em ${LEGAL_UPDATED_AT}. Leia e aceite para continuar usando o app.`}
        </p>
      </div>
      <AcceptTermsForm />
    </main>
  );
}
