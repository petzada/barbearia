import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronRight, FileText, Shield } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { account } from "@/server/db/schema";
import { requireOnboardedUser } from "@/server/auth";
import { isPhoneTempEmail } from "@/server/auth/config";
import { PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { MODE_LABELS } from "@/components/shell/nav-config";
import { availableModes, MODE_COOKIE, resolveMode } from "@/lib/modes";
import { formatBrazilPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { AvatarUpload, GoogleLinkButton, NameForm, SignOutButton } from "./profile-forms";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const google = await db.query.account.findFirst({
    where: and(eq(account.userId, user.id), eq(account.providerId, "google")),
  });
  const modes = availableModes(user);
  const current = resolveMode(user, (await cookies()).get(MODE_COOKIE)?.value ?? "cliente");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Perfil" />
      <PageBody className="gap-8">
        <section className="flex items-center gap-4 rounded-lg bg-card p-5 shadow-card">
          <BarberAvatar name={user.name} image={user.image} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-extrabold">{user.name}</p>
            <p className="text-sm text-ink-subtle">{formatBrazilPhone(user.phoneNumber)}</p>
            {!isPhoneTempEmail(user.email) && <p className="truncate text-sm text-ink-subtle">{user.email}</p>}
          </div>
        </section>

        {modes.length > 1 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Modo de uso</SectionTitle>
            <div className="grid gap-1 rounded-lg bg-muted p-1" style={{ gridTemplateColumns: `repeat(${modes.length}, 1fr)` }}>
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
                  {MODE_LABELS[m].replace("Modo ", "")}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <SectionTitle>Seus dados</SectionTitle>
          <div className="flex flex-col gap-5 rounded-lg bg-card p-5 shadow-card">
            <NameForm initialName={user.name} />
            {(user.isBarber || user.isAdmin) && <AvatarUpload />}
          </div>
        </section>

        {env.googleClientId && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Login com Google</SectionTitle>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-card p-5 shadow-card">
              <p className="text-sm text-ink-subtle">
                {google ? "Conectado. Você pode entrar pelo Google." : "Conecte para entrar mesmo sem receber o código."}
              </p>
              {!google && <GoogleLinkButton />}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
            {[
              { href: "/termos", label: "Termos de uso", icon: FileText },
              { href: "/privacidade", label: "Política de privacidade", icon: Shield },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center gap-3 px-5 py-4 text-sm font-semibold">
                  <item.icon className="size-5 text-ink-subtle" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="size-4 text-ink-tertiary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <SignOutButton />
        </section>
      </PageBody>
    </main>
  );
}
