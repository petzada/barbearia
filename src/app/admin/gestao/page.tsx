import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Clock, Crown, MessageCircle, Scissors, Star, User, Users, type LucideIcon } from "lucide-react";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { listServices } from "@/server/catalog";
import { listPlans } from "@/server/payments/service";
import { listTeam } from "@/server/team";
import { getFeedbackStats } from "@/server/feedback";
import { getWhatsappConfig } from "@/server/whatsapp/service";
import { listUpcomingClosures } from "@/server/schedule-config";
import { PageBody, PageHeader } from "@/components/page-header";
import { RowIcon, SettingsGroup, rowClass } from "@/components/kit/settings-list";
import { cn, countLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Gestão" };

const WHATSAPP_STATUS: Record<string, { label: string; tone: string }> = {
  connected: { label: "Conectado", tone: "text-success-ink" },
  connecting: { label: "Conectando", tone: "text-warning-ink" },
  qr_required: { label: "Escanear QR", tone: "text-warning-ink" },
  disconnected: { label: "Desconectado", tone: "text-destructive" },
  not_configured: { label: "Não configurado", tone: "text-destructive" },
  unknown: { label: "Verificar", tone: "text-warning-ink" },
};

function HubRow({ href, icon, label, status, statusTone }: { href: string; icon: LucideIcon; label: string; status?: string; statusTone?: string }) {
  return (
    <Link href={href} className={rowClass}>
      <RowIcon icon={icon} />
      <span className="flex-1 font-semibold">{label}</span>
      {status && (
        <span className={cn("flex items-center gap-1.5 text-sm text-ink-subtle", statusTone)}>
          {statusTone && <span className="size-2 rounded-full bg-current" aria-hidden />}
          {status}
        </span>
      )}
      <ChevronRight className="size-4 text-ink-tertiary" aria-hidden />
    </Link>
  );
}

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
          <HubRow href="/admin/gestao/servicos" icon={Scissors} label="Serviços" status={countLabel(services.length, "ativo", "ativos")} />
          <HubRow href="/admin/gestao/planos" icon={Crown} label="Planos do clube" status={countLabel(plans.length, "ativo", "ativos")} />
        </SettingsGroup>
        <SettingsGroup title="Equipe e agenda">
          <HubRow href="/admin/gestao/equipe" icon={Users} label="Equipe" status={countLabel(barbers, "barbeiro", "barbeiros")} />
          <HubRow
            href="/admin/gestao/horarios"
            icon={Clock}
            label="Horários e regras"
            status={closures.length > 0 ? countLabel(closures.length, "feriado", "feriados") : undefined}
          />
        </SettingsGroup>
        <SettingsGroup title="Relacionamento">
          <HubRow
            href="/admin/gestao/avaliacoes"
            icon={Star}
            label="Avaliações"
            status={stats.average != null ? `★ ${stats.average.toFixed(1).replace(".", ",")}` : "Sem avaliações"}
          />
          <HubRow href="/admin/gestao/whatsapp" icon={MessageCircle} label="WhatsApp" status={wa.label} statusTone={wa.tone} />
        </SettingsGroup>
        <SettingsGroup title="Conta">
          <HubRow href="/perfil" icon={User} label="Meu perfil" />
        </SettingsGroup>
      </PageBody>
    </main>
  );
}
