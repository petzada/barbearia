import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireAdminUser } from "@/server/auth";
import { listServices } from "@/server/catalog";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicosPage() {
  await requireAdminUser();
  const db = await getDb();
  const services = await listServices(db, { includeInactive: true });
  return (
    <main className="flex flex-1 flex-col">
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
    </main>
  );
}
