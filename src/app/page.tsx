import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { AtSign, Check, Clock, MapPin, MessageCircle } from "lucide-react";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { listServices } from "@/server/catalog";
import { listPlans } from "@/server/payments/service";
import { getBusinessHours, getShopSettings } from "@/server/settings";
import { BrandMark } from "@/components/brand-mark";
import { StickyCta } from "@/components/landing/sticky-cta";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPriceCents } from "@/lib/agenda/availability";
import { summarizeWeek } from "@/lib/agenda/week";
import { getServiceIcon } from "@/lib/services/icons";
import { CYCLE_LABELS } from "@/lib/plans";
import { formatBrazilPhone, normalizeBrazilPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export default async function LandingPage() {
  await connection();
  const db = await getDb();
  const [user, services, plans, settings, week] = await Promise.all([
    getCurrentUser(),
    listServices(db),
    listPlans(db),
    getShopSettings(db),
    getBusinessHours(db),
  ]);
  const bookHref = user ? "/agendar" : "/login";
  const whatsapp = settings.phone ? normalizeBrazilPhone(settings.phone).normalized : null;
  const mapsHref = settings.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.shopName}, ${settings.address}`)}`
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Hero — foto em tela cheia */}
      <section className="relative flex min-h-dvh flex-col overflow-hidden bg-black text-white">
        <Image
          src="/images/hero.webp"
          alt="Interior da Barbearia do Moura"
          fill
          priority
          sizes="100vw"
          className="object-cover object-top"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 via-35% to-black/90"
          aria-hidden
        />
        <header className="relative z-10 flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top))] lg:px-10">
          <BrandMark inverted />
          <a
            href={user ? "/entrar" : "/login"}
            className="rounded-md bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
          >
            {user ? "Abrir app" : "Entrar"}
          </a>
        </header>
        <div className="relative z-10 mt-auto flex flex-col items-center gap-3 px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] text-center lg:pb-16">
          <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-tight lg:text-6xl">
            {settings.shopName}
          </h1>
          <p className="text-lg text-white/80">Estilo, tradição e atitude</p>
          <div id="hero-cta" className="mt-4 flex w-full max-w-sm flex-col gap-3">
            <Link href={bookHref} className={buttonVariants({ size: "lg", className: "w-full" })}>
              Agendar horário
            </Link>
            {!user && (
              <Link href="/login" className="py-2 text-sm font-semibold text-white/80 hover:text-white">
                Já tenho conta
              </Link>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-5 py-12 pb-28 md:pb-16 lg:px-10">
        {/* Serviços */}
        <section aria-labelledby="servicos" className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cta">Serviços</p>
            <h2 id="servicos" className="text-[28px] font-extrabold tracking-tight">
              O que fazemos
            </h2>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {services.map((s) => {
              const Icon = getServiceIcon(s.name);
              return (
                <li key={s.id} className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-card">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-teal-soft text-cta">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{s.name}</p>
                    {s.description && <p className="line-clamp-1 text-sm text-ink-subtle">{s.description}</p>}
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-ink-subtle">
                      <Clock className="size-3.5" aria-hidden />
                      {s.durationMinutes} min
                    </p>
                  </div>
                  <span className="tabular shrink-0 font-extrabold">{formatPriceCents(s.priceCents)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Clube */}
        {plans.length > 0 && (
          <section aria-labelledby="clube" className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cta">Clube Moura</p>
              <h2 id="clube" className="text-[28px] font-extrabold tracking-tight">
                Assine e economize
              </h2>
            </div>
            <ul className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
              {plans.map((plan) => (
                <li
                  key={plan.id}
                  className={cn(
                    "flex w-[78%] shrink-0 snap-center flex-col gap-4 rounded-lg p-6 shadow-card sm:w-[46%] lg:w-auto",
                    plan.highlighted ? "bg-ink text-white" : "bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-extrabold">{plan.name}</p>
                    {plan.highlighted && <Badge className="bg-cta text-cta-foreground">Recomendado</Badge>}
                  </div>
                  <p>
                    <span className="tabular text-3xl font-extrabold tracking-tight">{formatPriceCents(plan.priceCents)}</span>
                    <span className={cn("text-sm", plan.highlighted ? "text-white/60" : "text-ink-subtle")}>
                      {" "}
                      /{CYCLE_LABELS[plan.cycle]}
                    </span>
                  </p>
                  {plan.benefits.length > 0 && (
                    <ul className="flex flex-col gap-2 text-sm">
                      {plan.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-cta" aria-hidden />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={user ? "/clube" : "/login"}
                    className={buttonVariants({
                      variant: plan.highlighted ? "default" : "outline",
                      className: "mt-auto w-full",
                    })}
                  >
                    Quero assinar
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Onde estamos */}
        <section aria-labelledby="onde" className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cta">Visite</p>
            <h2 id="onde" className="text-[28px] font-extrabold tracking-tight">
              Onde estamos
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card">
              {settings.address && (
                <a
                  href={mapsHref ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 font-semibold"
                >
                  <MapPin className="mt-0.5 size-5 shrink-0 text-cta" aria-hidden />
                  <span>
                    {settings.address}
                    <span className="block text-sm font-semibold text-cta">Abrir no mapa</span>
                  </span>
                </a>
              )}
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 font-semibold">
                  <MessageCircle className="size-5 shrink-0 text-success" aria-hidden />
                  {formatBrazilPhone(settings.phone)}
                </a>
              )}
              {settings.instagram && (
                <a
                  href={`https://instagram.com/${settings.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 font-semibold"
                >
                  <AtSign className="size-5 shrink-0 text-ink-subtle" aria-hidden />@{settings.instagram}
                </a>
              )}
            </div>
            <div className="rounded-lg bg-card p-5 shadow-card">
              <p className="mb-3 flex items-center gap-2 font-bold">
                <Clock className="size-5 text-cta" aria-hidden />
                Horário de funcionamento
              </p>
              <dl className="flex flex-col gap-2 text-sm">
                {summarizeWeek(week).map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <dt className="text-ink-subtle">{row.label}</dt>
                    <dd className={cn("tabular font-semibold", row.hours === "Fechado" && "text-ink-tertiary")}>
                      {row.hours}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline bg-card px-5 py-8 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center text-sm text-ink-subtle md:flex-row md:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.shopName} · Mauá/SP
          </p>
          <nav className="flex gap-4 font-semibold">
            <Link href="/termos" className="hover:text-ink">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="hover:text-ink">
              Privacidade
            </Link>
          </nav>
        </div>
      </footer>

      <StickyCta href={bookHref} targetId="hero-cta" />
    </div>
  );
}
