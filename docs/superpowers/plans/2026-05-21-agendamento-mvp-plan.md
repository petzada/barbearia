# Plano de Implementação — MVP de Agendamento — Barbearia do Moura

**Data:** 2026-05-21
**Spec:** `docs/superpowers/specs/2026-05-21-agendamento-mvp-design.md`
**Status:** Pronto para implementação

Plano em fases pequenas e verificáveis. Cada fase entrega algo testável e deixa o app em estado funcional. As fases seguem o encadeamento aprovado: papéis → schema → disponibilidade → cliente → barbeiro → admin → roteamento + golden path.

## Prerequisitos e convenções

- **AGENTS.md:** este Next.js (16.2.6) tem mudanças que divergem do conhecido. **Antes de escrever qualquer código Next.js**, ler o guia relevante em `node_modules/next/dist/docs/` (Server Actions, Route Handlers, layouts, `cookies()`), respeitando avisos de deprecação.
- **Stack já presente:** Next.js App Router + TS, Tailwind v4, shadcn/Base UI, React Hook Form, Zod, `@supabase/ssr`. Reusar os componentes em `src/components/ui/` e os clients em `src/lib/supabase/`.
- **Migrations:** SQL versionado em `supabase/migrations/`, nomeado `<timestamp>_<slug>.sql`, seguindo o estilo da migration existente (comentários em PT, `set search_path = ''` em funções, RLS explícito).
- **Supabase é cloud:** não há stack local (`config.toml` ausente). Migrations aplicadas no projeto cloud. A verificação de SQL/RLS segue o padrão já usado no scaffold (script de verificação + checklist manual) — ver "Estratégia de verificação" abaixo.
- **Fuso:** toda montagem de grade/horário em `America/Sao_Paulo`; persistência em `timestamptz`.

## Estratégia de verificação (decidida)

O projeto não tem runner de testes nem Supabase local, e a verificação seguirá **scripts SQL + checklist manual** (sem framework de testes):

- **Scripts SQL de verificação:** arquivos `.sql` rodados contra o Postgres do projeto cloud (no padrão do "script de verificacao E2E" já existente no scaffold), exercitando a exclusion constraint, as RLS e `get_available_slots` com dados de exemplo e asserts via `do $$ ... raise exception ... $$` ou `select` comparativos. Manter esses scripts em `supabase/verify/` (ou pasta equivalente já usada).
- **Checklist manual no navegador:** golden path e casos de borda exercitados na UI, no espírito do critério de pronto do scaffold.

As etapas "Verificação" de cada fase abaixo descrevem o que o script SQL e/ou o passo manual devem cobrir. Nenhuma dependência de teste nova é adicionada ao `package.json`.

---

## Fase 1 — Migração de papéis (capability flags + helpers)

**Objetivo:** substituir o enum `role` por flags e centralizar a checagem de papel.

**Arquivos:**
- `supabase/migrations/<ts>_roles_flags.sql` (novo)
- Buscar e atualizar qualquer referência a `role`/`user_role` no código TS.

**Passos:**
1. Migration:
   - `alter table public.profiles add column is_barber boolean not null default false;`
   - `alter table public.profiles add column is_admin boolean not null default false;`
   - `alter table public.profiles add column accepting_bookings boolean not null default true;`
   - Remover a coluna `role` e depois `drop type public.user_role;`.
   - Criar `public.is_admin(uid uuid)` e `public.is_barber(uid uuid)` (`security definer`, `set search_path = ''`, leem a coluna correspondente).
   - Policy extra em `profiles`: admin pode `select`/`update` qualquer linha (usando `public.is_admin((select auth.uid()))`), além das policies de dono já existentes.
2. Grep por `role` em `src/` (ex.: `profile-form.tsx`, `validations/profile.ts`, layout) e ajustar tipos/usos.
3. Atualizar o comentário de promoção manual na migration de profiles (agora `update profiles set is_admin = true, is_barber = true where id = '<uuid>'`).

**Verificação:** `npm run build` passa; `/conta` continua lendo/editando o profile; helper `is_admin`/`is_barber` retorna correto para um usuário promovido via SQL.

---

## Fase 2 — Schema de domínio (services, business_hours, schedule_entries)

**Objetivo:** criar as tabelas de negócio, a trava de sobreposição e as RLS.

**Arquivos:**
- `supabase/migrations/<ts>_services.sql`
- `supabase/migrations/<ts>_business_hours.sql`
- `supabase/migrations/<ts>_schedule_entries.sql`
- `supabase/migrations/<ts>_seed_services_hours.sql` (seed inicial; ou seção de seed)

**Passos:**
1. `services` (colunas + `CHECK duration % 30 = 0 and duration > 0`); RLS: SELECT autenticado, escrita só admin (via `public.is_admin`).
2. `business_hours` (PK `weekday`, `CHECK close_time > open_time`); RLS igual a services. Seed das 7 linhas (ex.: domingo `is_closed`).
3. `create extension if not exists btree_gist;`
4. Enums `schedule_entry_type` (`appointment`|`block`) e `schedule_entry_status` (`booked`|`cancelled`).
5. `schedule_entries` com colunas do spec, `CHECK (ends_at > starts_at)`, `CHECK` de consistência por tipo (appointment exige `service_id`), FKs.
6. Exclusion constraint `schedule_entries_no_overlap` (`exclude using gist (barbeiro_id with =, tstzrange(starts_at, ends_at) with &&) where (status = 'booked')`).
7. RLS de `schedule_entries` conforme spec (SELECT por dono/barbeiro/admin; INSERT cliente só appointment próprio em barbeiro com `accepting_bookings`; INSERT barbeiro na própria agenda; UPDATE de cancelamento; sem DELETE). `grant select, insert, update on ... to authenticated`.

**Verificação:** inserir manualmente dois ranges sobrepostos no mesmo barbeiro → 2º falha; adjacentes passam; mesmo range em barbeiros diferentes passa; mudar status para `cancelled` libera o range. Tentativas de SELECT cruzado entre clientes barradas pela RLS.

---

## Fase 3 — Disponibilidade (`get_available_slots`)

**Objetivo:** a função que devolve horários de início livres, sem vazar dados de terceiros.

**Arquivos:**
- `supabase/migrations/<ts>_get_available_slots.sql`
- `src/lib/agenda/availability.ts` (helpers TS de grade/fuso, se parte do cálculo ficar no app; manter o núcleo no SQL)
- `supabase/verify/get_available_slots.sql` (script SQL de verificação)

**Passos:**
1. Função `public.get_available_slots(p_barbeiro_id uuid, p_service_id uuid, p_dia date)` (`security definer`, `set search_path = ''`): lê `business_hours` do weekday; se `is_closed` retorna vazio; gera marcas de 30 min; calcula `n = duration/30`; subtrai `schedule_entries booked` (appointments + blocks); valida que os `n` slots estão livres e que o serviço termina ≤ `close_time`; descarta marcas a menos de 30 min de agora (fuso SP).
2. `grant execute` para `authenticated`.
3. Helpers TS para o seletor de dia (janela 45 dias) e formatação no fuso SP.

**Verificação (testes do spec):** 1 slot vs 2 slots; horário que vazaria o expediente é excluído; antecedência 30 min; dia fechado; bloqueios e agendamentos subtraindo; janela 45 dias no seletor.

---

## Fase 4 — Fluxo do cliente (`/agendar`, `/meus-agendamentos`)

**Objetivo:** cliente agenda e gerencia os próprios agendamentos.

**Arquivos:**
- `src/app/(app)/agendar/page.tsx` + componentes de passos (serviço → barbeiro → dia → horários)
- `src/app/(app)/agendar/actions.ts` (Server Action de criação)
- `src/app/(app)/meus-agendamentos/page.tsx` + `actions.ts` (cancelar)
- `src/lib/validations/agendamento.ts` (Zod)

**Passos:**
1. `/agendar`: lista `services` ativos; cards de barbeiros com `accepting_bookings`; seletor de dia (45 dias); chama `get_available_slots`; confirma.
2. Server Action de criação: revalida `service.active`/duração, calcula `ends_at`, insere `appointment`. Captura violação da exclusion constraint (código `23P01`) → erro "esse horário acabou de ser preenchido" + recarrega grade.
3. `/meus-agendamentos`: lista próprios (futuros/passados); botão Cancelar habilitado só com >30 min de antecedência; Server Action valida a regra dos 30 min antes do `update status='cancelled'`.

**Verificação:** agendar cria a entry e bloqueia o horário; conflito simulado mostra o toast; cancelar com >30 min libera; ≤30 min bloqueado (UI + action). Verificação manual no navegador (golden path parcial).

---

## Fase 5 — Agenda do barbeiro (`/agenda`)

**Objetivo:** timeline vertical do dia (estilo AppBarber) + bloqueio + encaixe manual.

**Arquivos:**
- `src/app/(app)/agenda/page.tsx` (timeline vertical, navegação por data)
- `src/app/(app)/agenda/actions.ts` (criar block, criar encaixe manual, cancelar)
- componentes de bloqueio e de encaixe manual.

**Passos:**
1. Página lê `schedule_entries` da própria agenda (`barbeiro_id = auth.uid()`) do dia selecionado; renderiza em coluna vertical com horário + cliente/serviço (ou motivo do bloqueio).
2. Bloquear horário: form início/fim → insere `block`; conflito (trava) mostra o agendamento afetado.
3. Encaixe manual: insere `appointment` com `service_id` + nome no `note`, `client_id` nulo opcional.
4. Cancelar qualquer entry da própria agenda (sem regra de 30 min para o barbeiro).

**Verificação:** agendamento do cliente (Fase 4) aparece na agenda; bloqueio impede novo agendamento naquele range; encaixe manual aparece só na agenda; cancelar libera.

---

## Fase 6 — Admin (`/admin`, `/configuracoes`, `/barbeiros`)

**Objetivo:** configurar serviços, horário e barbeiros; dashboard mínimo.

**Arquivos:**
- `src/app/(app)/admin/page.tsx` (métricas mínimas)
- `src/app/(app)/configuracoes/page.tsx` + `actions.ts` (CRUD services + edição business_hours)
- `src/app/(app)/barbeiros/page.tsx` + `actions.ts` (toggle `accepting_bookings`)
- `src/lib/validations/servico.ts`, `src/lib/validations/horario.ts` (Zod)

**Passos:**
1. `/configuracoes`: CRUD de `services` (nome, duração múltipla de 30, preço em centavos, ativo, ordem) + edição das 7 linhas de `business_hours`. Server Actions protegidas por `is_admin`.
2. `/barbeiros`: lista profiles com `is_barber`; liga/desliga `accepting_bookings`.
3. `/admin`: agendamentos de hoje e da semana, total por barbeiro (queries agregadas simples).

**Verificação:** mudar duração de serviço altera quantos slots ele ocupa em `/agendar`; desativar serviço some do booking; fechar um dia em `business_hours` zera a disponibilidade dele; desligar barbeiro o remove de `/agendar`; não-admin não acessa as telas.

---

## Fase 7 — Roteamento por papel + golden path

**Objetivo:** mandar cada papel para sua área e proteger as rotas; validar ponta a ponta.

**Arquivos:**
- `src/app/(app)/layout.tsx` (checagem de capacidade já valida sessão)
- `src/app/page.tsx` (redirect raiz por papel)
- navegação do app (menu com áreas conforme capacidades).

**Passos:**
1. Pós-login: barbeiro→`/agenda`; admin (não-barbeiro)→`/admin`; senão→`/agendar`.
2. `(app)/layout.tsx`: bloquear `/agenda` a não-barbeiros, `/admin`,`/configuracoes`,`/barbeiros` a não-admins (usando os helpers).
3. Menu mostra todas as áreas a que o usuário tem direito (admin-barbeiro vê ambas).

**Verificação (golden path manual completo):** cliente agenda → aparece na agenda do barbeiro → cliente cancela (>30 min) libera o horário → outro cliente consegue pegar o mesmo horário. Acessos indevidos redirecionados. `npm run build` e `npm run lint` limpos.

---

## Ordem de merge e estado funcional

Cada fase deixa o app rodando: Fases 1–3 são fundação (sem UI nova além do que já existe); a partir da Fase 4 há funcionalidade visível incremental. Recomenda-se um commit por fase, com a verificação correspondente passando antes de seguir.
