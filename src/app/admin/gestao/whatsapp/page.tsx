import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireAdminUser, toActor } from "@/server/auth";
import { getWhatsappConfig, listWhatsappLogs } from "@/server/whatsapp/service";
import { getShopSettings } from "@/server/settings";
import { WHATSAPP_LOG_KINDS, type WhatsappLogKind } from "@/server/db/schema";
import { PageBody, PageHeader } from "@/components/page-header";
import { WhatsappPanel } from "./whatsapp-panel";

export const metadata: Metadata = { title: "WhatsApp" };

export default async function WhatsappPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const kind = (WHATSAPP_LOG_KINDS as readonly string[]).includes(tipo ?? "") ? (tipo as WhatsappLogKind) : undefined;
  const user = await requireAdminUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [config, logs, settings] = await Promise.all([
    getWhatsappConfig(db),
    listWhatsappLogs(db, toActor(user), { kind, limit: 40 }),
    getShopSettings(db),
  ]);
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="WhatsApp" backHref="/admin/gestao" backLabel="Gestão" />
      <PageBody className="gap-7">
        <WhatsappPanel
          apiConfigured={Boolean(env.whatsmiauApiKey)}
          config={{
            status: config.status,
            instanceName: config.instanceName,
            phoneConnected: config.phoneConnected,
            qrCode: config.qrCode,
            lastSyncAt: config.lastSyncAt?.getTime() ?? null,
            remindersEnabled: config.remindersEnabled,
            reminderTemplate: config.reminderTemplate,
            reminderHour: config.reminderHour,
          }}
          shop={{ name: settings.shopName, phone: settings.phone, address: settings.address }}
          kind={kind}
          logs={logs.map((l) => ({
            id: l.id,
            kind: l.kind,
            status: l.status,
            toPhone: l.toPhone,
            message: l.message,
            error: l.error,
            createdAt: l.createdAt.getTime(),
          }))}
        />
      </PageBody>
    </main>
  );
}
