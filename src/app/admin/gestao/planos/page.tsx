import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { listPlansWithSubscribers } from "@/server/club-admin";
import { PlansManager } from "./plans-manager";

export const metadata: Metadata = { title: "Planos do clube" };

export default async function PlanosPage() {
  const user = await requireAdminUser();
  const db = await getDb();
  const plans = await listPlansWithSubscribers(db, toActor(user));
  return (
    <main className="flex flex-1 flex-col">
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
    </main>
  );
}
