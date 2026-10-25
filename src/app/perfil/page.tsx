import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { FileText, MessageCircle, Shield } from "lucide-react";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { account } from "@/server/db/schema";
import { requireOnboardedUser } from "@/server/auth";
import { isPhoneTempEmail } from "@/server/auth/config";
import { getShopSettings } from "@/server/settings";
import { PageBody, PageHeader } from "@/components/page-header";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { MODE_LABELS } from "@/components/shell/nav-config";
import { availableModes, MODE_COOKIE, resolveMode } from "@/lib/modes";
import { formatBrazilPhone, normalizeBrazilPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import {
  AvatarRow,
  DeleteAccountButton,
  GoogleRow,
  NameRow,
  RemindersRow,
  SignOutButton,
} from "./profile-forms";
import { SettingsGroup, SettingsLink } from "./settings-list";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [google, settings] = await Promise.all([
    db.query.account.findFirst({ where: and(eq(account.userId, user.id), eq(account.providerId, "google")) }),
    getShopSettings(db),
  ]);
  const modes = availableModes(user);
  const current = resolveMode(user, (await cookies()).get(MODE_COOKIE)?.value ?? "cliente");
  const shopWhatsapp = settings.phone ? normalizeBrazilPhone(settings.phone).normalized : null;
  const isStaff = user.isAdmin || user.isBarber;

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Perfil" />
      <PageBody className="gap-7">
        <section className="flex flex-col items-center gap-2 text-center">
          <BarberAvatar name={user.name} image={user.image} size="lg" className="size-24 text-3xl" />
          <p className="mt-1 text-xl font-extrabold">{user.name}</p>
          <p className="text-sm text-ink-subtle">{formatBrazilPhone(user.phoneNumber)}</p>
          {!isPhoneTempEmail(user.email) && <p className="text-sm text-ink-subtle">{user.email}</p>}
        </section>

        {modes.length > 1 && (
          <nav
            aria-label="Modo de uso"
            className="grid gap-1 rounded-lg bg-muted p-1"
            style={{ gridTemplateColumns: `repeat(${modes.length}, 1fr)` }}
          >
            {modes.map((m) => (
              <Link
                key={m}
                href={`/modo/${m}`}
                prefetch={false}
                aria-current={m === current ? "true" : undefined}
                className={cn(
                  "flex h-11 items-center justify-center rounded-md text-sm font-bold transition",
                  m === current ? "bg-card text-ink shadow-card" : "text-ink-subtle",
                )}
              >
                {MODE_LABELS[m].replace("Modo ", "").replace(/^./, (c) => c.toUpperCase())}
              </Link>
            ))}
          </nav>
        )}

        <SettingsGroup title="Conta">
          <NameRow initialName={user.name} />
          {isStaff && <AvatarRow />}
          {env.googleClientId && <GoogleRow connected={Boolean(google)} />}
        </SettingsGroup>

        <SettingsGroup title="Notificações">
          <RemindersRow enabled={user.whatsappReminders} />
        </SettingsGroup>

        <SettingsGroup title="Ajuda">
          {shopWhatsapp && (
            <SettingsLink href={`https://wa.me/${shopWhatsapp}`} icon={MessageCircle} label="Falar com a barbearia" external />
          )}
          <SettingsLink href="/termos" icon={FileText} label="Termos de uso" />
          <SettingsLink href="/privacidade" icon={Shield} label="Política de privacidade" />
        </SettingsGroup>

        <div className="flex flex-col gap-2">
          <SignOutButton />
          {isStaff ? (
            <p className="px-5 text-center text-xs text-ink-subtle">
              Para excluir uma conta da equipe, remova antes o acesso de barbeiro ou gestão.
            </p>
          ) : (
            <DeleteAccountButton />
          )}
        </div>
      </PageBody>
    </main>
  );
}
