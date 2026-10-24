import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser, toActor } from "@/server/auth";
import { getEntry } from "@/server/scheduling";
import { DomainError } from "@/server/errors";
import { createPaymentGateway, startAppointmentPix } from "@/server/payments/service";
import { PageBody, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { formatPriceCents } from "@/lib/agenda/availability";
import { PixPanel } from "./pix-panel";

export const metadata: Metadata = { title: "Pagar com Pix" };

export default async function PixPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const entry = await getEntry(db, id);
  if (!entry || entry.clientId !== user.id) notFound();

  if (entry.paymentStatus === "paid") {
    return (
      <main className="flex flex-1 flex-col">
        <PageHeader title="Pagamento" backHref="/agendamentos" />
        <PageBody>
          <div className="flex flex-col items-center gap-3 rounded-lg bg-card p-8 text-center shadow-card">
            <CheckCircle2 className="size-12 text-success" aria-hidden />
            <p className="text-lg font-bold">Pagamento confirmado</p>
            <Link href="/agendamentos" className={buttonVariants()}>
              Ver meus agendamentos
            </Link>
          </div>
        </PageBody>
      </main>
    );
  }

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
        description={payment ? `Total ${formatPriceCents(payment.amountCents)}` : undefined}
        backHref="/agendamentos"
      />
      <PageBody>
        {payment ? (
          <PixPanel
            paymentId={payment.id}
            brCode={payment.brCode ?? ""}
            qrImage={payment.brCodeBase64}
            expiresAt={payment.expiresAt?.getTime() ?? null}
            devMode={payment.devMode}
          />
        ) : (
          <div className="flex flex-col gap-3 rounded-lg bg-card p-6 text-center shadow-card">
            <p className="font-bold">{error}</p>
            <p className="text-sm text-ink-subtle">Seu horário continua marcado. Você pode pagar na barbearia.</p>
          </div>
        )}
      </PageBody>
    </main>
  );
}
