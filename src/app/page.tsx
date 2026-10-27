import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { listServices } from "@/server/catalog";
import { listPlans } from "@/server/payments/service";
import { getBusinessHours, getShopSettings } from "@/server/settings";
import { BrandMark } from "@/components/brand-mark";
import { StickyCta } from "@/components/landing/sticky-cta";
import { PlanCard } from "@/components/club/plan-card";
import { PlansCarousel } from "@/components/landing/plans-carousel";
import { InstagramIcon } from "@/components/instagram-icon";
import { buttonVariants } from "@/components/ui/button";
import { summarizeWeek } from "@/lib/agenda/week";
import { formatBrazilPhone, normalizeBrazilPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { splitAddress } from "@/lib/landing/address";

const MAP_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3654.128906657452!2d-46.46719242466647!3d-23.671347678724402!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce69ec2b13876d%3A0x8ff0fa6cf9c23f78!2sBarbearia%20do%20Moura!5e0!3m2!1spt-BR!2sbr!4v1793139105534!5m2!1spt-BR!2sbr";

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

  const address = settings.address ? splitAddress(settings.address) : null;
  const planItems = plans.map((plan) => ({
    key: plan.id,
    node: (
      <PlanCard
        plan={{
          ...plan,
          coveredServiceNames: services.filter((s) => plan.coveredServiceIds.includes(s.id)).map((s) => s.name),
        }}
        footer={
          <Link
            href={user ? "/clube" : "/login"}
            className={cn(
              buttonVariants({ size: "lg", variant: plan.highlighted ? "default" : "outline" }),
              "mt-auto w-full",
              // Contorno visível (sem fundo e sem teal) para os planos não destacados.
              !plan.highlighted && "border-ink/40 bg-transparent",
            )}
          >
            Assinar
          </Link>
        }
      />
    ),
  }));

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Hero — foto em tela cheia, parada: o conteúdo sobe por cima dela. */}
      <section className="sticky top-0 flex h-svh flex-col overflow-hidden bg-surface-dark text-on-dark">
        <Image
          src="/images/hero.webp"
          alt="Interior da Barbearia do Moura"
          fill
          priority
          sizes="100vw"
          className="object-cover object-top"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-scrim/45 via-scrim/10 via-35% to-scrim/90"
          aria-hidden
        />
        <header className="relative z-10 flex justify-center px-5 pt-[calc(1rem+env(safe-area-inset-top))] lg:px-10">
          <h1>
            <span className="sr-only">{settings.shopName}</span>
            <BrandMark inverted alt="" className="h-20" />
          </h1>
        </header>
        <div className="relative z-10 mt-auto flex flex-col items-center gap-3 px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] text-center lg:pb-16">
          <p className="whitespace-nowrap text-[22px] font-extrabold tracking-tight lg:text-4xl">Estilo, tradição e atitude</p>
          <div id="hero-cta" className="mt-4 flex w-full max-w-sm flex-col gap-3">
            <Link href={bookHref} className={buttonVariants({ size: "lg", className: "w-full" })}>
              Agendar horário
            </Link>
            {!user && (
              <Link href="/login" className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-on-dark/80 hover:text-on-dark">
                Já tenho conta
              </Link>
            )}
          </div>
        </div>
      </section>

      <main
        id="landing-content"
        className="relative z-10 w-full bg-background px-5 py-12 pb-16 lg:px-10"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-14">
          {/* Serviços — os primeiros (ordem da gestão) ganham destaque no bento. */}
          <section aria-labelledby="servicos" className="flex flex-col gap-5">
            <SectionHeading id="servicos" title="Serviços" subtitle="Conheça os nossos serviços" />
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {services.map((s, i) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg bg-card p-5 shadow-card",
                    i === 0 ? "col-span-2 min-h-40 justify-end bg-surface-dark text-on-dark" : "min-h-44",
                  )}
                >
                  <p className={cn("font-extrabold leading-tight tracking-tight", i === 0 ? "text-2xl" : "text-lg")}>{s.name}</p>
                  {s.description && (
                    <p className={cn("line-clamp-3 text-sm", i === 0 ? "text-on-dark/75" : "text-ink-subtle")}>{s.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Clube */}
          {plans.length > 0 && (
            <section aria-labelledby="clube" className="flex flex-col gap-5">
              <SectionHeading id="clube" title="Clube do Moura" subtitle="Assine e economize" />
              <PlansCarousel items={planItems} initialIndex={Math.floor((plans.length - 1) / 2)} />
            </section>
          )}

          {/* Visite */}
          <section aria-labelledby="onde" className="flex flex-col gap-5">
            <SectionHeading id="onde" title="Conheça nosso espaço" subtitle="Você será muito bem-vindo" />
            <div className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card">
              {address && (
                <div className="text-center">
                  <p className="text-lg font-bold leading-snug">{address.street}</p>
                  {address.area && <p className="text-[15px] font-semibold text-ink-subtle">{address.area}</p>}
                </div>
              )}
              <iframe
                src={MAP_EMBED_SRC}
                title="Mapa da Barbearia do Moura"
                className="aspect-[4/3] w-full rounded-md border-0 lg:aspect-[21/9]"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="font-semibold">
                  {formatBrazilPhone(settings.phone)}
                </a>
              )}
            </div>
          </section>

          {/* Horário */}
          <section aria-labelledby="horario" className="flex flex-col gap-5">
            <SectionHeading id="horario" title="Não perca tempo" subtitle="Confira nosso horário de funcionamento" />
            <div className="rounded-lg bg-card p-5 shadow-card">
              <p className="mb-3 text-center font-bold">Horários</p>
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
          </section>
        </div>
      </main>

      <footer
        id="landing-footer"
        className="relative z-10 border-t border-hairline bg-card px-5 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center text-sm text-ink-subtle">
          <BrandMark className="h-12" />
          <p>
            © {new Date().getFullYear()} {settings.shopName}
          </p>
          <nav className="flex justify-center gap-4 font-semibold">
            <Link href="/termos" className="inline-flex min-h-11 items-center hover:text-ink">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="inline-flex min-h-11 items-center hover:text-ink">
              Privacidade
            </Link>
          </nav>
          {settings.instagram && (
            <a
              href={`https://instagram.com/${settings.instagram}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex flex-col items-center gap-2 rounded-lg bg-black px-6 py-4 font-semibold text-white"
            >
              <InstagramIcon className="size-9" />@{settings.instagram}
            </a>
          )}
        </div>
      </footer>

      <StickyCta href={bookHref} targetId="hero-cta" coverId="landing-content" endId="landing-footer" />
    </div>
  );
}

function SectionHeading({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h2 id={id} className="whitespace-nowrap text-[clamp(22px,7vw,28px)] font-extrabold leading-tight tracking-tight">
        {title}
      </h2>
      <p className="whitespace-nowrap text-[15px] text-ink-subtle">{subtitle}</p>
    </div>
  );
}
