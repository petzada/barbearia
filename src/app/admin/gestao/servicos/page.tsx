import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireAdminUser } from "@/server/auth";
import { listServices } from "@/server/catalog";
import { PageBody, PageHeader } from "@/components/page-header";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicosPage() {
  await requireAdminUser();
  const db = await getDb();
  const services = await listServices(db, { includeInactive: true });
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Serviços" backHref="/admin/gestao" backLabel="Gestão" description="Arraste para mudar a ordem em que o cliente vê." />
      <PageBody>
        <ServicesManager
          services={services.map(({ id, name, description, durationMinutes, priceCents, active, sortOrder }) => ({
            id,
            name,
            description,
            durationMinutes,
            priceCents,
            active,
            sortOrder,
          }))}
        />
      </PageBody>
    </main>
  );
}
