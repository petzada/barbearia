import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { listPlansWithSubscribers } from "@/server/club-admin";
import { PageBody, PageHeader } from "@/components/page-header";
import { PlansManager } from "./plans-manager";

export const metadata: Metadata = { title: "Planos do clube" };

export default async function PlanosPage() {
  const user = await requireAdminUser();
  const db = await getDb();
  const plans = await listPlansWithSubscribers(db, toActor(user));
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Planos do clube" backHref="/admin/gestao" backLabel="Gestão" description="Assim o cliente vê cada plano no app." />
      <PageBody>
        <PlansManager
          plans={plans.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description,
            priceCents: p.priceCents,
            cycle: p.cycle,
            benefits: p.benefits,
            active: p.active,
            highlighted: p.highlighted,
            sortOrder: p.sortOrder,
            subscribers: p.subscribers,
          }))}
        />
      </PageBody>
    </main>
  );
}
