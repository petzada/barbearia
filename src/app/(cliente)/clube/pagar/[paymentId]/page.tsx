import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { QrCode } from "lucide-react";
import { getDb } from "@/server/db";
import { payments } from "@/server/db/schema";
import { requireOnboardedUser } from "@/server/auth";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { formatPriceCents } from "@/lib/agenda/availability";
import { PixPanel } from "@/components/pix/pix-panel";

export const metadata: Metadata = { title: "Pagar o Clube com Pix" };

/** Pix do Clube (adesão ou renovação enviada no WhatsApp). */
export default async function ClubPixPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const user = await requireOnboardedUser();
  const db = await getDb();
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (!payment || payment.userId !== user.id || payment.kind !== "subscription") notFound();
  if (payment.status === "paid") redirect("/clube?assinatura=ok");

  const renewal = payment.cycleStart != null;
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title={renewal ? "Renovar o Clube" : "Assinar com Pix"}
        description={`${formatPriceCents(payment.amountCents)} · confirmação automática`}
        backHref="/clube"
      />
      <PageBody>
        {payment.status === "pending" && payment.brCode ? (
          <PixPanel
            paymentId={payment.id}
            brCode={payment.brCode}
            qrImage={payment.brCodeBase64}
            expiresAt={payment.expiresAt?.getTime() ?? null}
            devMode={payment.devMode}
            paidHref="/clube?assinatura=ok"
            expiredHref="/clube"
            expiredDescription="Volte ao clube para assinar de novo ou fale com a barbearia."
          />
        ) : (
          <EmptyState
            icon={QrCode}
            title="Este Pix não está mais disponível"
            description="Ele expirou ou foi substituído por outro pagamento."
            action={
              <Link href="/clube" className={buttonVariants({ size: "lg" })}>
                Voltar ao clube
              </Link>
            }
          />
        )}
      </PageBody>
    </main>
  );
}
