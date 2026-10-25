import type { Metadata } from "next";
import { Clock, Crown, MessageCircle, Scissors, Star, User, Users } from "lucide-react";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { listServices } from "@/server/catalog";
import { listPlans } from "@/server/payments/service";
import { listTeam } from "@/server/team";
import { getFeedbackStats } from "@/server/feedback";
import { getWhatsappConfig } from "@/server/whatsapp/service";
import { listUpcomingClosures } from "@/server/schedule-config";
import { PageBody, PageHeader } from "@/components/page-header";
import { SettingsGroup, SettingsLink } from "@/components/kit/settings-list";
import { countLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Gestão" };

const WHATSAPP_STATUS: Record<string, { label: string; tone: string }> = {
  connected: { label: "Conectado", tone: "text-success-ink" },
  connecting: { label: "Conectando", tone: "text-warning-ink" },
  qr_required: { label: "Escanear QR", tone: "text-warning-ink" },
  disconnected: { label: "Desconectado", tone: "text-destructive" },
  not_configured: { label: "Não configurado", tone: "text-destructive" },
  unknown: { label: "Verificar", tone: "text-warning-ink" },
};

export default async function GestaoPage() {
  const user = await requireAdminUser();
  const actor = toActor(user);
  const db = await getDb();
  const [services, plans, team, stats, whatsapp, closures] = await Promise.all([
    listServices(db),
    listPlans(db),
    listTeam(db, actor),
    getFeedbackStats(db, actor),
    getWhatsappConfig(db),
    listUpcomingClosures(db),
  ]);
  const barbers = team.filter((m) => m.isBarber).length;
  const wa = WHATSAPP_STATUS[whatsapp.status] ?? WHATSAPP_STATUS.unknown;

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Gestão" />
      <PageBody className="gap-7">
        <SettingsGroup title="Catálogo">
          <SettingsLink href="/admin/gestao/servicos" icon={Scissors} label="Serviços" value={countLabel(services.length, "ativo", "ativos")} />
          <SettingsLink href="/admin/gestao/planos" icon={Crown} label="Planos do clube" value={countLabel(plans.length, "ativo", "ativos")} />
        </SettingsGroup>
        <SettingsGroup title="Equipe e agenda">
          <SettingsLink href="/admin/gestao/equipe" icon={Users} label="Equipe" value={countLabel(barbers, "barbeiro", "barbeiros")} />
          <SettingsLink
            href="/admin/gestao/horarios"
            icon={Clock}
            label="Horários e regras"
            value={closures.length > 0 ? countLabel(closures.length, "feriado", "feriados") : undefined}
          />
        </SettingsGroup>
        <SettingsGroup title="Relacionamento">
          <SettingsLink
            href="/admin/gestao/avaliacoes"
            icon={Star}
            label="Avaliações"
            value={stats.average != null ? `★ ${stats.average.toFixed(1).replace(".", ",")}` : "Sem avaliações"}
          />
          <SettingsLink href="/admin/gestao/whatsapp" icon={MessageCircle} label="WhatsApp" value={wa.label} valueTone={wa.tone} />
        </SettingsGroup>
        <SettingsGroup title="Conta">
          <SettingsLink href="/perfil" icon={User} label="Meu perfil" />
        </SettingsGroup>
      </PageBody>
    </main>
  );
}
