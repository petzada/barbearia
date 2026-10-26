import { BackToPrevious } from "./back-to-previous";
import type { LegalSection } from "@/content/legal";

/** Página legal: título grande, data, índice clicável e seções em texto corrido. */
export function LegalLayout({
  title,
  summary,
  updatedAt,
  sections,
}: {
  title: string;
  summary: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-12">
      <header className="flex flex-col gap-3">
        <BackToPrevious />
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight lg:text-[32px]">{title}</h1>
        <p className="text-[15px] text-ink-subtle">{summary}</p>
        <p className="text-xs font-bold uppercase tracking-wider text-ink-tertiary">Atualizada em {updatedAt}</p>
      </header>

      <nav aria-label="Nesta página" className="rounded-lg bg-card p-5 shadow-card">
        <p className="mb-3 text-sm font-bold">Nesta página</p>
        <ol className="flex flex-col gap-2 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="font-semibold text-cta-ink hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-8">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="flex scroll-mt-6 flex-col gap-3">
            <h2 className="text-lg font-bold tracking-tight">{s.title}</h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="text-[15px] leading-relaxed text-ink-muted">
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink-muted">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
