# Design — Wizard de agendamento (/agendar)

Data: 2026-05-21

## Objetivo

Reconstruir a tela `/agendar` como um wizard de onboarding em 4 etapas, no estilo
passo-a-passo, mantendo consistência com o design já existente (tema escuro
Linear, acento pêssego `#EBB07E`, cards só-borda `rounded-xl border border-hairline`).

A lógica de servidor (`fetchAvailableSlots`, `createAppointment`) e os helpers de
disponibilidade (`src/lib/agenda/availability.ts`) permanecem intactos. A mudança é
de UX/apresentação no cliente.

## Fluxo

Ordem das etapas (reordenação em relação ao fluxo atual `Serviço → Barbeiro → Dia →
Hora → Confirmar`):

1. **Profissional** — escolher o barbeiro
2. **Serviço** — escolher o serviço
3. **Horário** — escolher data e horário (combinados numa tela)
4. **Resumo** — revisar e confirmar

Navegação: avançar acontece ao selecionar um item (barbeiro, serviço, slot).
Voltar acontece pelo botão de voltar na topbar: etapa 1 volta para **Home**
(`/home`); etapas 2–4 voltam para a etapa anterior do wizard.

## Indicador de passos (breadcrumb)

- Texto: `Profissional › Serviço › Horário`, com o passo atual em **negrito** e os
  demais em cor apagada (`ink-tertiary`).
- **Centralizado** horizontalmente. Todo o resto do conteúdo permanece alinhado à
  esquerda.
- Aparece nas etapas **Profissional**, **Serviço** e **Horário** (passo atual em
  negrito).
- **Não** aparece no **Resumo** (4).

## Topbar com imagens — Modelo A

Decisão de produto (após implementação): o banner **não** será substituído pela foto
do profissional. O fundo promocional permanece; a foto oficial do barbeiro entra
apenas no **avatar circular** (com iniciais como fallback).

### Fundo compartilhado (`BookingTopbarCarousel`)

- Carrossel automático e infinito com `/images/home1.webp` … `home4.webp` (sem
  controles do usuário).
- Altura do banner: **168px** (`BOOKING_TOPBAR_HEIGHT_CLASS`), sangrando a largura
  do `main` com `-mx-5`.
- Topo colado à borda da viewport (`main` com `pt-0`).

### Etapa 1 — `PromoImageTopbar`

- Apenas o carrossel promocional + gradiente sutil no rodapé.
- Botão **voltar** → `/home` (canto superior esquerdo, círculo semi-transparente).

### Etapas 2, 3 e 4 — `BarberTopbar`

- Mesmo carrossel promocional no fundo.
- **Overlay escurecido** (`from-black/25` … `to-black/55`) para legibilidade do
  conteúdo sobre as fotos.
- **Avatar circular** centralizado (~64px): hoje **iniciais** (acento pêssego,
  `getInitials`); no futuro, **foto oficial** do profissional (`profiles.avatar_url`)
  com iniciais só como fallback.
- Botão **voltar** → etapa anterior do wizard.
- **Nome** do barbeiro centralizado na base do banner, com sombra de texto.

### Futuro: `avatar_url` (Cloudflare R2)

- **Manter** o carrossel `home1`–`home4` no fundo em todas as etapas com topbar.
- **Substituir** o conteúdo do círculo: `<img>` circular quando houver URL; senão,
  iniciais como hoje.
- Cards da lista na etapa Profissional podem usar o mesmo `avatar_url` nos avatares
  ~46px da lista (fallback: iniciais).

## Etapas em detalhe

### Etapa 1 — Profissional

- `PromoImageTopbar` (carrossel promocional) no topo.
- Breadcrumb com **Profissional** em destaque.
- Cabeçalho: título **"Novo agendamento"** + descrição **"Escolha seu barbeiro
  preferido"**.
- Lista vertical de barbeiros: cada um é um **card só-borda** (mesmo padrão dos
  cards de agendamento da `/home`: `rounded-xl border border-hairline bg-transparent`),
  contendo avatar circular de iniciais (~46px) + nome ao lado + chevron à direita.
- Estado vazio (nenhum barbeiro com `accepting_bookings`): manter a mensagem atual
  pedindo para o admin ativar um profissional.

### Etapa 2 — Serviço

- Topbar do barbeiro no topo.
- Breadcrumb (Serviço em negrito).
- Título: **"Qual serviço você quer agendar?"**
- Lista de serviços como cards só-borda selecionáveis: nome + duração (`X min`) +
  preço. Selecionar um serviço avança para Horário.

### Etapa 3 — Horário

- Topbar do barbeiro no topo.
- Breadcrumb (Horário em negrito).
- Título: **"Quando você quer vir?"**
- **Seleção de data — padrão híbrido:**
  - Tira em **6 colunas** (largura total): até **5 chips** via `getQuickDayKeys(day)`
    (âncora = dia selecionado + até 4 dias seguintes na janela; sem seleção, primeiros
    5 de `getSelectableDateKeys`). Cada chip: dia da semana abreviado + número. Ativo:
    borda pêssego + `surface-2`.
  - Chip final com **ícone de calendário** abre **bottom sheet** (`BookingCalendarSheet`,
    shadcn `Sheet` side bottom, portal sobre a bottom bar). Fecha ao clicar fora, Esc ou
    ao escolher um dia.
  - No sheet: grade mensal com navegação **jan–dez do ano vigente em SP**; dias
    habilitados só se estiverem em `getSelectableDateKeys` (janela de 45 dias).
  - Ao escolher data no sheet: chips recentralizam na data escolhida; `loadSlots` roda
    para o novo dia.
  - **"Hoje" já vem selecionado** ao abrir a etapa, e os slots de hoje já são
    carregados.
- **Slots de horário:** grid de 3 colunas, ficam **ocultos até uma data ser
  selecionada** (na prática aparecem já com hoje selecionado). Carregados via
  `fetchAvailableSlots(barberId, serviceId, dia)`.
  - Estado de carregamento: "Carregando horários…".
  - Sem horários: "Nenhum horário livre neste dia."
- Selecionar um slot avança para o Resumo.

### Etapa 4 — Resumo

- Topbar do barbeiro no topo.
- **Sem** breadcrumb. Título **centralizado**: **"Confirme seu agendamento"**.
- Card de resumo (só-borda) com linhas: **Profissional**, **Serviço**, **Data**,
  **Horário**.
- **Total:** rótulo à esquerda; valor em R$ (`formatPriceCents`) alinhado à **direita**.
- CTA primário (indigo): **"Confirmar agendamento"** → chama `createAppointment`.
  - Sucesso: toast "Agendamento confirmado!" + `router.push("/meus-agendamentos")`.
  - Conflito (slot tomado / fora da janela): toast de erro + voltar para a etapa
    Horário recarregando os slots (lógica de conflito já existente em `actions.ts`).

## Componentes

Refatorar `src/app/(app)/agendar/booking-wizard.tsx` num fluxo de 4 etapas. O estado
(barbeiro, serviço, dia, slot, slots, step) continua no `BookingWizard`. Extrair
sub-componentes focados, cada um com uma responsabilidade clara:

- `StepIndicator` — breadcrumb centralizado (`barber` | `service` | `schedule`).
- `BookingTopbarCarousel` — carrossel `home1`–`home4` compartilhado.
- `PromoImageTopbar` — etapa 1 (carrossel + voltar para Home).
- `BarberTopbar` — etapas 2–4 (carrossel + overlay + avatar circular + voltar + nome).
- `BarberStep` — etapa 1 (topbar promocional + breadcrumb + lista de barbeiros).
- `ServiceStep` — etapa 2.
- `ScheduleStep` — etapa 3 (chips de dia + sheet de calendário + slots).
- `BookingCalendarSheet` — bottom sheet com `MonthCalendar` (navegação mensal no ano
  vigente; dias selecionáveis limitados à janela de 45 dias).
- `MonthCalendar` — grade mensal apresentacional (setas prev/next, cabeçalho, células).
- `SummaryStep` — etapa 4.

Reutilizar: `getInitials`/`getFirstName` (`display-name.ts`), helpers de
`availability.ts` (`formatPriceCents`, `formatSelectableDay`, `formatSlotTime`,
`getSelectableDateKeys`, `getQuickDayKeys`), componente `Button`, e o padrão de card só-borda.

## Dados

- `page.tsx` busca `services` (ativos) e `barbers` (`is_barber` +
  `accepting_bookings`, `id, full_name`). Iniciais via `full_name`; schema atual
  suficiente para o MVP.
- **Fora de escopo (futuro):** coluna `avatar_url` em `profiles`, upload via
  Cloudflare R2 e UI de upload. No **Modelo A**, `avatar_url` alimenta o avatar
  circular (topbar e cards da lista), não o fundo do banner.

## Observações de implementação

- **AGENTS.md:** esta versão do Next.js tem mudanças de API/convenções. Antes de
  escrever código, ler o guia relevante em `node_modules/next/dist/docs/`.
- Esconder scrollbar nas tiras de dia (classe `scrollbar-none` já existe).
- É uma feature de UI: validação final é manual no navegador (caminho feliz +
  estados: sem barbeiro, sem slots, conflito no confirmar). As server actions já
  estão validadas e não mudam.

## Fora de escopo

- Upload/armazenamento de fotos de barbeiro (virá com Cloudflare R2).
- Mudanças nas server actions e na lógica de disponibilidade.
- Qualquer mudança em outras telas além de `/agendar`.
