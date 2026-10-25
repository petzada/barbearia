import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";
import { LEGAL_UPDATED_AT, PRIVACY } from "@/content/legal";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  return (
    <LegalLayout
      title="Política de privacidade"
      summary="Como a Barbearia do Moura coleta, usa, compartilha e protege seus dados pessoais no site e no app."
      updatedAt={LEGAL_UPDATED_AT}
      sections={PRIVACY}
    />
  );
}
