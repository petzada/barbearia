/** Painel elevado: branco, cantos de 16px e sombra suave (sem borda). */
export const elevatedPanelClass = "rounded-lg bg-card shadow-card";

/** Item de lista tocável (card inteiro como botão/link). */
export const pressablePanelClass =
  "rounded-lg bg-card shadow-card transition-[transform,box-shadow] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50";

/**
 * Chip selecionável (dias, horários, filtros): h-11, teal preenchido quando
 * ativo. Funciona com `aria-pressed` (botões) e `aria-current` (links).
 * Chips só SELECIONAM — a ação fica sempre no botão primário.
 */
export const chipClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-hairline-strong bg-card text-sm font-semibold transition-colors hover:border-cta/60 aria-pressed:border-cta aria-pressed:bg-cta aria-pressed:text-cta-foreground aria-[current=true]:border-cta aria-[current=true]:bg-cta aria-[current=true]:text-cta-foreground aria-[current=page]:border-cta aria-[current=page]:bg-cta aria-[current=page]:text-cta-foreground disabled:opacity-40";

/** Grupo de linhas (estilo Ajustes): card branco com divisórias. */
export const rowGroupClass = "divide-y divide-hairline overflow-hidden rounded-lg bg-card shadow-card";

/** Linha de lista que abre algo: min-h-14, ícone 36px, chevron à direita. */
export const rowClass =
  "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted focus-visible:bg-muted focus-visible:outline-none aria-busy:opacity-60";

/** Ícone de 36px em teal-soft no início da linha. */
export const rowIconClass = "flex size-9 shrink-0 items-center justify-center rounded-md bg-teal-soft text-cta-ink [&_svg]:size-[18px]";
