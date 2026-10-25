import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Star } from "lucide-react";
import { RatingStars } from "@/components/kit/rating-stars";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { getFeedbackStats, listFeedbackHistory } from "@/server/feedback";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { formatDayLabel } from "@/lib/agenda/format";
import { normalizeBrazilPhone } from "@/lib/phone";
import { getFirstName } from "@/lib/profile/display-name";
import { chipClass, chipRowClass } from "@/lib/ui/classes";
import { cn, countLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Avaliações" };

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

export default async function AvaliacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ barbeiro?: string; baixas?: string }>;
}) {
  const params = await searchParams;
  const user = await requireAdminUser();
  const actor = toActor(user);
  const db = await getDb();
  const stats = await getFeedbackStats(db, actor);
  const barberId = stats.byBarber.some((b) => b.barberId === params.barbeiro) ? params.barbeiro : undefined;
  const lowOnly = params.baixas === "1";
  const list = await listFeedbackHistory(db, actor, { barberId, lowOnly, limit: 100 });
  const href = (patch: { barbeiro?: string | null; baixas?: boolean }) => {
    const q = new URLSearchParams();
    const b = patch.barbeiro === undefined ? barberId : patch.barbeiro;
    const l = patch.baixas === undefined ? lowOnly : patch.baixas;
    if (b) q.set("barbeiro", b);
    if (l) q.set("baixas", "1");
    const s = q.toString();
    return `/admin/gestao/avaliacoes${s ? `?${s}` : ""}`;
  };
  const maxCount = Math.max(1, ...stats.distribution);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Avaliações" backHref="/admin/gestao" backLabel="Gestão" />
      <PageBody>
        {stats.total === 0 ? (
          <EmptyState
            icon={Star}
            title="Nenhuma avaliação ainda"
            description="Depois de cada atendimento concluído, o cliente pode avaliar pelo app."
            action={
              <Link href="/admin/agenda" className={buttonVariants({ size: "lg" })}>
                Abrir agenda
              </Link>
            }
          />
        ) : (
          <>
            <section className="flex items-center gap-6 rounded-lg bg-card p-5 shadow-card">
              <div className="flex flex-col items-center">
                <p className="text-display">{fmt(stats.average ?? 0)}</p>
                <RatingStars rating={stats.average ?? 0} />
                <p className="mt-1 text-xs text-ink-subtle">{countLabel(stats.total, "avaliação", "avaliações")}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-1.5" aria-label="Distribuição das notas">
                {[5, 4, 3, 2, 1].map((n) => (
                  <li key={n} className="flex items-center gap-2 text-xs">
                    <span className="tabular w-6 font-bold">{n}★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-warning" style={{ width: `${(stats.distribution[n - 1] / maxCount) * 100}%` }} />
                    </span>
                    <span className="tabular w-8 text-right text-ink-subtle">{stats.distribution[n - 1]}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className={chipRowClass}>
              <Link
                href={href({ barbeiro: null })}
                aria-current={!barberId ? "true" : undefined}
                className={cn("shrink-0 px-4", chipClass)}
              >
                Todos
              </Link>
              {stats.byBarber.map((b) => (
                <Link
                  key={b.barberId}
                  href={href({ barbeiro: b.barberId })}
                  aria-current={barberId === b.barberId ? "true" : undefined}
                  className={cn("shrink-0 gap-1.5 px-4", chipClass)}
                >
                  {b.name}
                  <span className="tabular text-xs opacity-80">★ {fmt(b.average)}</span>
                </Link>
              ))}
            </div>

            <Link
              href={href({ baixas: !lowOnly })}
              aria-current={lowOnly ? "true" : undefined}
              className={cn("w-fit px-4", chipClass)}
            >
              Só notas baixas (até 3★)
            </Link>

            {list.length === 0 ? (
              <EmptyState
                compact
                icon={Star}
                title={lowOnly ? "Nenhuma nota baixa" : "Nenhuma avaliação neste filtro"}
                action={
                  <Link href={href({ barbeiro: null, baixas: false })} className={buttonVariants({ variant: "outline" })}>
                    Limpar filtros
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {list.map((f) => {
                  const phone = f.clientPhone ? normalizeBrazilPhone(f.clientPhone).normalized : null;
                  return (
                    <li key={f.id} className="flex flex-col gap-2 rounded-lg bg-card p-4 shadow-card">
                      <RatingStars rating={f.rating} />
                      {f.comment && <p className="text-[15px]">“{f.comment}”</p>}
                      <p className="text-sm text-ink-subtle">
                        {f.clientName} · {f.barberName} · {f.serviceName ?? "Serviço"} ·{" "}
                        {formatDayLabel(f.createdAt)}
                      </p>
                      {f.rating <= 3 && phone && (
                        <a
                          href={`https://wa.me/${phone}?text=${encodeURIComponent(`Olá, ${getFirstName(f.clientName)}! Aqui é da Barbearia do Moura. Vimos sua avaliação e queremos entender o que aconteceu.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
                        >
                          <MessageCircle aria-hidden />
                          Responder no WhatsApp
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </PageBody>
    </main>
  );
}
