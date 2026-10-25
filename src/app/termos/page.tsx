import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";
import { LEGAL_UPDATED_AT, TERMS } from "@/content/legal";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermosPage() {
  return (
    <LegalLayout
      title="Termos de uso"
      summary="Como usar com segurança o site e o app da Barbearia do Moura para agendar, pagar e assinar o Clube Moura."
      updatedAt={LEGAL_UPDATED_AT}
      sections={TERMS}
    />
  );
}
