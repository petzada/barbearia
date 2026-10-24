# Plano de implementação — Wizard de agendamento (/agendar)

Spec: `docs/superpowers/specs/2026-05-21-agendar-wizard-design.md`
Data: 2026-05-21

## Princípios

- Mudança é só de UX/cliente. **Não** mexer em `actions.ts`, em
  `src/lib/agenda/availability.ts` nem no schema/migrations.
- Reutilizar tokens e padrões existentes (cards só-borda, acento `#EBB07E`,
  `getInitials`, helpers de data).
- AGENTS.md: antes de escrever JSX/rotas, conferir o guia em
  `node_modules/next/dist/docs/01-app` para convenções desta versão do Next.

## Pré-leitura (antes de codar)

- [ ] `node_modules/next/dist/docs/01-app` — checar convenções de client components /
      rotas relevantes a esta versão.
- [ ] Reler `booking-wizard.tsx`, `appointment-card.tsx` (padrão card só-borda),
      `service-icon-strip.tsx` (avatar circular), `home-header.tsx` (uso de
      `getInitials`).

## Etapas

### 1. Refatorar a estrutura do wizard
`src/app/(app)/agendar/booking-wizard.tsx`

- [ ] Reordenar o tipo `Step` para `"barber" | "service" | "schedule" | "summary"`.
- [ ] Estado inicial passa a ser `"barber"` (hoje é `"service"`).
- [ ] Manter o estado central (barber, service, day, slot, slots, pending) no
      `BookingWizard`; ele orquestra qual etapa renderiza e passa callbacks.
- [ ] Combinar dia+horário numa única etapa `schedule` (hoje são `day` e `time`).
- [ ] No mount da etapa `schedule`, pré-selecionar **hoje** (`getSelectableDateKeys()[0]`)
      e disparar `loadSlots` automaticamente.
- [x] Voltar: etapa 1 → `/home`; etapas 2–4 → etapa anterior via topbar.

### 2. `StepIndicator` (breadcrumb)
Novo: `src/app/(app)/agendar/step-indicator.tsx`

- [x] Props: `current: "barber" | "service" | "schedule"`.
- [x] Renderiza `Profissional › Serviço › Horário`, centralizado, atual em negrito,
      demais em `text-ink-tertiary`.
- [x] Renderizado em Profissional, Serviço e Horário (não no Resumo).

### 3. Topbars com imagens (Modelo A)
`booking-topbar-carousel.tsx`, `promo-image-topbar.tsx`, `barber-topbar.tsx`

- [x] Carrossel compartilhado `home1`–`home4`, automático, altura **168px**, `-mx-5`.
- [x] `PromoImageTopbar` (etapa 1): só carrossel + voltar para `/home`.
- [x] `BarberTopbar` (etapas 2–4): carrossel + overlay escurecido + avatar circular
      (iniciais) + voltar + nome na base.
- [x] Futuro `avatar_url`: foto **no círculo**; iniciais como fallback; fundo
      promocional **permanece** (ver spec — Modelo A).

### 4. `BarberStep` (etapa 1)
Novo: `src/app/(app)/agendar/barber-step.tsx`

- [x] `PromoImageTopbar` + breadcrumb (`barber`) + cabeçalho + lista.
- [ ] Lista de barbeiros como cards só-borda
      (`rounded-xl border border-hairline bg-transparent`): avatar circular de
      iniciais (~`size-11`/46px) + nome + chevron à direita. Clique → `onSelect(barber)`.
- [ ] Estado vazio: manter mensagem atual de "nenhum barbeiro disponível".

### 5. `ServiceStep` (etapa 2)
Novo: `src/app/(app)/agendar/service-step.tsx`

- [ ] Topbar + StepIndicator(`service`).
- [ ] Título "Qual serviço você quer agendar?".
- [ ] Cards só-borda de serviço (nome + `X min` + preço via `formatPriceCents`).
      Clique → `onSelect(service)`.

### 6. `MonthCalendar` (popover de calendário)
Novo: `src/app/(app)/agendar/month-calendar.tsx`

- [ ] Grade de mês própria, sem dependência nova.
- [ ] Props: `selected`, `onSelect(dateKey)`, e a janela permitida
      (derivar de `getSelectableDateKeys()` → primeiro/último dia válidos).
- [ ] Navegação de mês limitada à janela; dias fora da janela desabilitados.
- [ ] Acionado por um botão/ícone de calendário; abre/fecha como popover simples
      (estado local controlado pelo `ScheduleStep`; fechar ao selecionar/clicar fora).
- [ ] Reutilizar `formatSelectableDay`/chaves `YYYY-MM-DD` para consistência de fuso.

### 7. `ScheduleStep` (etapa 3)
Novo: `src/app/(app)/agendar/schedule-step.tsx`

- [ ] Topbar + StepIndicator(`schedule`).
- [ ] Título "Quando você quer vir?".
- [ ] Tira horizontal de chips de dia (`scrollbar-none`, scroll-x): dia da semana
      abreviado + número; ativo com borda pêssego + `surface-2`. Chip final com ícone
      de calendário abre o `MonthCalendar`.
- [ ] Slots em grid de 3 colunas, ocultos até haver data; estados "Carregando
      horários…" e "Nenhum horário livre neste dia." Clique no slot → `onSelect(slot)`.

### 8. `SummaryStep` (etapa 4)
Novo: `src/app/(app)/agendar/summary-step.tsx`

- [ ] Topbar, **sem** breadcrumb. Título centralizado "Confirme seu agendamento".
- [ ] Card de resumo (só-borda): Profissional, Serviço, Data
      (`formatSelectableDay`), Horário (`formatSlotTime`).
- [ ] Total em destaque (`formatPriceCents`).
- [ ] CTA "Confirmar agendamento" → `onConfirm` (usa `createAppointment`).
      Sucesso → toast + `router.push("/meus-agendamentos")`. Conflito → toast +
      voltar para `schedule` recarregando slots (manter lógica atual de `handleConfirm`).

### 9. Ajustar a página
`src/app/(app)/agendar/page.tsx`

- [ ] O cabeçalho "Novo agendamento" passa a viver dentro do `BarberStep` (etapa 1),
      pois etapas 2–4 usam a topbar e não o header da página. Remover o `<header>`
      fixo do `page.tsx` (ou condicioná-lo ao wizard).
- [ ] Garantir que o `main` permita a topbar sangrar a largura total (rever
      `px-5`/`-mx-5`). Manter a query de services/barbers como está.

## Verificação (manual, no navegador)

- [ ] `npm run dev` e percorrer o caminho feliz: barbeiro → serviço → hoje já
      selecionado com slots → escolher slot → resumo → confirmar → redirect para
      `/meus-agendamentos`.
- [ ] Calendário: abrir, navegar mês, escolher data futura; dias fora da janela de
      45 dias desabilitados.
- [ ] Estados: nenhum barbeiro disponível; dia sem slots; conflito ao confirmar
      (volta para Horário). Breadcrumb aparece só em Serviço/Horário e centralizado.
- [ ] `npm run lint` / typecheck limpos.

## Fora de escopo

- Upload/armazenamento de fotos (Cloudflare R2 + `avatar_url`) — trabalho futuro.
  Seguir **Modelo A** na spec: `avatar_url` no avatar circular, não no banner.
- Mudanças em server actions, disponibilidade ou outras telas.

## Atualização pós-implementação (Modelo A — fotos do profissional)

Decisão registrada na spec (`2026-05-21-agendar-wizard-design.md`):

| Camada | Comportamento |
|--------|----------------|
| Fundo do banner | Carrossel `home1`–`home4` em **todas** as etapas com topbar |
| Avatar central (etapas 2–4) | Círculo com foto oficial do profissional ou iniciais |
| Overlay | Escurecimento para legibilidade de avatar e nome |
| Lista etapa 1 | Avatares ~46px podem usar `avatar_url` no futuro (fallback: iniciais) |

**Não** implementar foto horizontal ocupando o banner inteiro (modelo descartado).
