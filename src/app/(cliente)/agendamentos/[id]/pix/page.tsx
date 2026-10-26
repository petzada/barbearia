import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser, toActor } from "@/server/auth";
import { getEntry } from "@/server/scheduling";
import { DomainError } from "@/server/errors";
import { createPaymentGateway, startAppointmentPix } from "@/server/payments/service";
import Link from "next/link";
import { QrCode, RotateCcw } from "lucide-react";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { formatPriceCents } from "@/lib/agenda/availability";
import { PixPanel } from "@/components/pix/pix-panel";

export const metadata: Metadata = { title: "Pagar com Pix" };

export default async function PixPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const entry = await getEntry(db, id);
  if (!entry || entry.clientId !== user.id) notFound();

  if (entry.paymentStatus === "paid") redirect(`/agendamentos/${id}/confirmado`);

  let payment = null;
  let error: string | null = null;
  try {
    payment = await startAppointmentPix(db, toActor(user), createPaymentGateway(env), id);
  } catch (e) {
    error = e instanceof DomainError ? e.message : "Não foi possível gerar o Pix agora.";
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Pagar com Pix"
        description={payment ? `${formatPriceCents(payment.amountCents)} · confirmação automática` : undefined}
        backHref="/agendamentos"
      />
      <PageBody>
        {payment ? (
          <PixPanel
            entryId={id}
            paymentId={payment.id}
            brCode={payment.brCode ?? ""}
            qrImage={payment.brCodeBase64}
            expiresAt={payment.expiresAt?.getTime() ?? null}
            devMode={payment.devMode}
          />
        ) : (
          <EmptyState
            icon={QrCode}
            title={error ?? "Não foi possível gerar o Pix agora."}
            description="Seu horário continua marcado. Tente de novo ou pague na barbearia."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href={`/agendamentos/${id}/pix`} className={buttonVariants({ size: "lg" })}>
                  <RotateCcw aria-hidden />
                  Tentar de novo
                </Link>
                <Link href="/agendamentos" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Ver meus agendamentos
                </Link>
              </div>
            }
          />
        )}
      </PageBody>
    </main>
  );
}
