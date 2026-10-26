import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { plans } from "@/server/db/schema";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { isPhoneTempEmail } from "@/server/auth/config";
import { getActiveSubscription } from "@/server/payments/service";
import { PageBody, PageHeader } from "@/components/page-header";
import { formatPriceCents } from "@/lib/agenda/availability";
import { formatBrazilPhone } from "@/lib/phone";
import { CYCLE_LABELS } from "@/lib/plans";
import { SubscribeFlow } from "./subscribe-flow";

export const metadata: Metadata = { title: "Assinar o Clube" };

export default async function AssinarPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  if (await getActiveSubscription(db, user.id)) redirect("/clube");
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
  if (!plan?.active) notFound();
  if (!env.abacatePayApiKey) redirect("/clube");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title={`Clube ${plan.name}`}
        description={`${formatPriceCents(plan.priceCents)}/${CYCLE_LABELS[plan.cycle]} · cancele quando quiser`}
        backHref="/clube"
      />
      <PageBody>
        <SubscribeFlow
          plan={{ id: plan.id, name: plan.name, priceCents: plan.priceCents, cycleLabel: CYCLE_LABELS[plan.cycle] }}
          publicKey={env.abacatePayPublicKey ?? null}
          payer={{
            name: user.name,
            cellphone: formatBrazilPhone(user.phoneNumber),
            email: isPhoneTempEmail(user.email) ? null : user.email,
            billingEmail: user.billingEmail,
            taxId: user.taxId,
          }}
        />
      </PageBody>
    </main>
  );
}
