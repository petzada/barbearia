# Agendamento — MVP — Barbearia do Moura

**Data:** 2026-05-21
**Status:** Aprovado para implementação
**Escopo desta fase:** Entregar o fluxo funcional de agendamento de ponta a ponta — cliente agenda serviços em horários livres (separados por barbeiro, com trava contra reserva dupla), barbeiro acompanha e gerencia a própria agenda, e admin configura serviços, horário de funcionamento e barbeiros. Construído sobre o scaffold já existente (`profiles`, Auth, RLS).

## Contexto

Web app mobile-first para uma única barbearia. O scaffold anterior entregou a fundação: tabela `profiles` ligada a `auth.users`, Supabase Auth (e-mail+senha), RLS por usuário e um stub de cron de lembretes. Esta fase adiciona o domínio de negócio: serviços, horário de funcionamento, agenda por barbeiro e o fluxo de booking.

A navegação é pensada no estilo de um app mobile nativo (telas separadas por função, estilo AppBarber). O painel admin de métricas/financeiro/assinaturas é foco futuro (mais voltado a desktop) e entra mínimo neste MVP.

### Decisões tomadas no brainstorming

- **Barbeiros:** 3 hoje, pode crescer. Cada barbeiro tem agenda própria; o cliente escolhe o profissional ao agendar.
- **Serviços e duração:** grade fixa de 30 min para os horários de início. Cada serviço tem duração configurada pelo admin (múltiplo de 30 min) e ocupa N slots consecutivos (corte 30min = 1 slot; corte+barba 60min = 2 slots). A lógica não quebra a grade de 30 em 30 — apenas reserva o range inteiro do serviço.
- **Horário de funcionamento:** único da barbearia (vale para todos os barbeiros), configurável pelo admin. Folgas individuais são tratadas por bloqueios do próprio barbeiro.
- **Tempo real:** disponibilidade recalculada a cada carregamento da tela (server-side) + trava no banco impedindo reserva dupla. Sem push ao vivo (Supabase Realtime fica para o futuro).
- **Ações do cliente:** ver e cancelar os próprios agendamentos. Reagendar = cancelar e criar outro.
- **Cancelamento pelo cliente:** permitido pelo app somente com mais de 30 min de antecedência do início. Dentro dos 30 min finais, o app bloqueia (cliente deve falar com o barbeiro). Barbeiro/admin cancelam a qualquer momento na própria agenda.
- **Admin no MVP:** tela de admin presente — gerencia serviços, horário de funcionamento e barbeiros pela interface. Dashboard de métricas mínimo nesta fase.
- **Agendamento manual do barbeiro:** o barbeiro pode criar um encaixe (walk-in) na própria agenda, com serviço e nome do cliente em texto livre, opcionalmente sem conta vinculada.
- **Papéis:** flags de capacidade (`is_barber`, `is_admin`) substituem o enum único `role`. Todo usuário é cliente por padrão. Um admin pode acumular o papel de barbeiro (as duas flags `true`). Promoção de usuários continua via SQL nesta fase.
- **Antecedência mínima para agendar:** 30 min. **Janela de agendamento:** 45 dias à frente.
- **Fuso da barbearia:** `America/Sao_Paulo`.

## Modelo de abordagem (escolhida)

Tabela única de eventos de agenda (`schedule_entries`) com `type` ∈ {`appointment`, `block`} e trava de sobreposição via **exclusion constraint** nativa do Postgres (`btree_gist`). Uma única regra impede, atomicamente, qualquer sobreposição no mesmo barbeiro — agendamento × agendamento e agendamento × bloqueio. Durações variáveis encaixam naturalmente (são apenas ranges maiores). Foi a escolha por ser a mais robusta contra conflito com menos código.

## Modelo de dados

### Mudança em `profiles` — flags de capacidade

Substitui o enum `role` (`user_role`) por flags booleanas:

| coluna | tipo | nota |
|---|---|---|
| `is_barber` | boolean not null default false | tem agenda; aparece na lista de booking |
| `is_admin` | boolean not null default false | poderes de administração |
| `accepting_bookings` | boolean not null default true | admin liga/desliga o barbeiro no booking sem apagá-lo |

Todo usuário é cliente por padrão (ambas as flags `false`). Um admin que também atende tem `is_barber = true` e `is_admin = true`. A migração remove a coluna `role` e o tipo `user_role`. O trigger `handle_new_user` continua criando o profile (flags assumem o default `false`).

#### Funções helper (centralizam a checagem de papel)

```sql
public.is_admin(uid uuid) returns boolean   -- lê profiles.is_admin
public.is_barber(uid uuid) returns boolean  -- lê profiles.is_barber
```

`SECURITY DEFINER`, usadas nas RLS policies e no app. Se um dia os papéis virarem dinâmicos (tabela N:N), troca-se apenas o corpo destas funções, sem tocar em policies nem telas.

### Tabela `services` (admin gerencia)

| coluna | tipo | nota |
|---|---|---|
| `id` | uuid PK | |
| `name` | text not null | "Corte", "Corte + Barba" |
| `duration_minutes` | int not null | `CHECK (duration_minutes > 0 AND duration_minutes % 30 = 0)` |
| `price_cents` | int not null | preço em centavos (evita float) |
| `active` | boolean not null default true | inativo some do booking, preserva histórico |
| `sort_order` | int not null default 0 | ordem de exibição |
| `created_at` | timestamptz not null default now() | |

### Tabela `business_hours` (admin gerencia) — uma linha por dia da semana

| coluna | tipo | nota |
|---|---|---|
| `weekday` | int PK | 0=domingo … 6=sábado |
| `open_time` | time not null | ex: 09:00 |
| `close_time` | time not null | ex: 19:00; `CHECK (close_time > open_time)` |
| `is_closed` | boolean not null default false | dia fechado |

Seed inicial com as 7 linhas (ex.: domingo fechado).

### Tabela `schedule_entries` (agendamentos e bloqueios)

| coluna | tipo | nota |
|---|---|---|
| `id` | uuid PK | |
| `barbeiro_id` | uuid not null FK→profiles(id) | dono da agenda |
| `type` | enum `schedule_entry_type` (`appointment`\|`block`) | |
| `client_id` | uuid null FK→profiles(id) | dono do agendamento; nulo em bloqueio e em encaixe manual sem conta |
| `service_id` | uuid null FK→services(id) | obrigatório quando appointment |
| `starts_at` | timestamptz not null | |
| `ends_at` | timestamptz not null | appointment: `starts_at + duração`; block: definido pelo barbeiro; `CHECK (ends_at > starts_at)` |
| `status` | enum `schedule_entry_status` (`booked`\|`cancelled`) not null default `booked` | cancelado não conta na trava |
| `note` | text null | motivo do bloqueio / nome do walk-in / obs |
| `created_at` | timestamptz not null default now() | |

**Trava de sobreposição (exclusion constraint):**

```sql
-- requer: create extension if not exists btree_gist;
alter table public.schedule_entries
  add constraint schedule_entries_no_overlap
  exclude using gist (
    barbeiro_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'booked');
```

O índice é parcial em `status = 'booked'`, então cancelar (mudar para `cancelled`) libera o range imediatamente. Ranges adjacentes (um termina exatamente onde o outro começa) não conflitam — `tstzrange` é half-open `[início, fim)`.

**CHECK de consistência por tipo:**

```sql
check (
  (type = 'appointment' and service_id is not null)
  or (type = 'block')
)
```

`client_id` é opcional mesmo em appointment (encaixe manual do barbeiro sem conta vinculada).

## Cálculo de disponibilidade

Função `get_available_slots(p_barbeiro_id uuid, p_service_id uuid, p_dia date)` (`SECURITY DEFINER`), que devolve só os horários de início livres — sem vazar quem reservou o quê. Algoritmo:

1. **Grade base:** lê `business_hours` do dia da semana de `p_dia`. Se `is_closed`, retorna vazio. Senão, gera marcas de 30 em 30 min de `open_time` até `close_time` (no fuso `America/Sao_Paulo`).
2. **Slots necessários:** `n = duration_minutes / 30` do serviço escolhido.
3. **Ocupação:** busca `schedule_entries` do barbeiro no dia com `status = 'booked'` (agendamentos e bloqueios entram igual).
4. **Horário válido se:** os `n` slots a partir dele estão todos livres **e** o serviço inteiro termina até o `close_time` (não vaza o expediente).
5. **Antecedência:** marcas com início em menos de 30 min a partir de agora são descartadas.
6. **Janela:** o seletor de dia no app limita a 45 dias à frente.

Roda no servidor a cada carregamento (coerente com "atualiza ao recarregar"). A trava do banco é a rede de segurança contra corrida.

## Segurança (RLS por papel)

`services` e `business_hours`:
- **SELECT:** qualquer usuário autenticado (cliente precisa ver serviços/preços e horário para montar a grade).
- **INSERT/UPDATE/DELETE:** apenas `is_admin`.

`schedule_entries`:
- **SELECT cliente:** apenas os próprios (`client_id = auth.uid()`). Não lê a tabela para montar disponibilidade — usa `get_available_slots`.
- **SELECT barbeiro:** todas as entries onde `barbeiro_id = auth.uid()`.
- **SELECT admin:** tudo.
- **INSERT cliente:** apenas `type='appointment'`, `client_id = auth.uid()`, em barbeiro com `accepting_bookings`. Regras de passado/janela/expediente validadas na Server Action; a trava do banco garante a não-sobreposição.
- **INSERT barbeiro:** `block` ou `appointment` (encaixe manual) na própria agenda (`barbeiro_id = auth.uid()`).
- **UPDATE (cancelar):** cliente cancela o próprio appointment (`booked`→`cancelled`) respeitando a regra de 30 min (validada na Server Action); barbeiro edita/cancela na própria agenda; admin em tudo.
- **DELETE:** ninguém (cancelamento é via status, preserva histórico).

`profiles`: mantém as policies do scaffold (cada um lê/edita a própria linha). Admin pode ler/atualizar flags de barbeiros (policy adicional usando `is_admin`).

## Fluxos e telas (mobile-first, estilo app nativo)

Roteamento ao logar: barbeiro→`/agenda`; admin (sem ser barbeiro)→`/admin`; senão→`/agendar`. O menu do app exibe todas as áreas a que o usuário tem direito (um admin-barbeiro alcança `/admin` a partir do app). O `(app)/layout.tsx` valida sessão (já existente) e ganha a checagem de capacidade para proteger cada área.

### Cliente

- **`/agendar`:** serviço (lista de `services` ativos com preço/duração) → barbeiro (cards dos profiles com `accepting_bookings`) → dia (seletor dentro de 45 dias) → horários livres (de `get_available_slots`) → confirmar. Sucesso → `/meus-agendamentos`; conflito → toast "esse horário acabou de ser preenchido" + recarrega a grade.
- **`/meus-agendamentos`:** lista dos próprios (futuros e passados). Botão **Cancelar** nos futuros, habilitado só com >30 min de antecedência.

### Barbeiro

- **`/agenda`:** foco principal — timeline vertical do dia (estilo AppBarber), com os horários na vertical e as informações de cada agendamento/bloqueio (cliente, serviço, horário). Navegação por data.
  - **Bloquear horário:** escolhe início/fim → cria `block` (almoço, folga). Validado pela mesma trava.
  - **Encaixe manual:** cria `appointment` com serviço + nome do cliente (texto), opcionalmente sem conta.
  - **Cancelar:** cancela qualquer entry da própria agenda, a qualquer momento.

### Admin

- **`/admin`:** dashboard de métricas mínimo no MVP — agendamentos de hoje e da semana, total por barbeiro. Aprofundamento (financeiro, assinaturas) é fase futura.
- **`/configuracoes`:** CRUD de serviços (nome, duração múltipla de 30, preço, ativo, ordem) + edição das 7 linhas de `business_hours`.
- **`/barbeiros`:** lista os profiles com `is_barber`; liga/desliga `accepting_bookings`. Promoção de usuários a barbeiro/admin continua via SQL nesta fase.

### Perfil

- **`/conta`:** tela existente (editar nome/telefone), acessível a todos como "perfil".

## Erros e casos de borda

- **Conflito de reserva (corrida):** dois clientes confirmam o mesmo horário quase juntos → o 2º `INSERT` viola a exclusion constraint. A Server Action captura o erro específico (código de violação de constraint) e devolve "esse horário acabou de ser preenchido" + recarrega a grade.
- **Serviço alterado/desativado durante a sessão:** na confirmação, a Server Action revalida `active` e `duration_minutes`; se mudou, pede para refazer.
- **Bloqueio sobre agendamento existente:** barbeiro tenta bloquear range que já tem cliente → a trava barra; a UI mostra o conflito e ele cancela os agendamentos afetados antes.
- **Cancelamento (cliente):** permitido pelo app só com >30 min de antecedência; dentro dos 30 min finais o botão fica desabilitado (validado também na Server Action). Cancelar libera o range.
- **Mudança de horário de funcionamento:** afeta apenas disponibilidade futura; agendamentos já feitos fora do novo expediente continuam válidos e aparecem na agenda do barbeiro.
- **Fuso/horário de verão:** grava `timestamptz`; grade montada em `America/Sao_Paulo`. Brasil sem DST atualmente, mas `timestamptz` cobre eventual retorno.
- **Encaixe manual sem conta:** `appointment` com `client_id` nulo e nome no `note`; não aparece em "meus agendamentos" (sem dono), só na agenda do barbeiro.
- **Barbeiro desligado (`accepting_bookings=false`):** some do `/agendar`; agendamentos futuros já existentes seguem na agenda dele.

## Testes

- **Lógica de disponibilidade (unitário):** serviço de 1 slot vs 2 slots; horário que vazaria o fim do expediente é excluído; antecedência de 30 min; janela de 45 dias; dia fechado; bloqueios e agendamentos subtraindo corretamente.
- **Trava de sobreposição (integração, Postgres real):** dois ranges sobrepostos no mesmo barbeiro → 2º falha; ranges adjacentes passam; mesmo range em barbeiros diferentes passa; `cancelled` libera o range.
- **RLS (integração):** cliente não lê agendamento de outro; cliente não insere com `client_id` alheio; barbeiro só enxerga/edita a própria agenda; só admin escreve em `services`/`business_hours`; helpers `is_admin`/`is_barber` testados.
- **Regras de cancelamento:** >30 min OK; ≤30 min bloqueado pelo app e pela Server Action.
- **Fluxo (manual, navegador):** golden path ponta a ponta — agendar → aparece na agenda do barbeiro → cancelar libera o horário → outro cliente consegue pegar.

Os testes de banco rodam contra o Postgres real (não mock), coerente com provar RLS e a exclusion constraint de verdade.

## Fora de escopo (fases futuras)

- Push ao vivo (Supabase Realtime) na disponibilidade.
- Reagendamento direto na interface (no MVP é cancelar + criar).
- Dashboard admin aprofundado: financeiro, assinaturas, métricas avançadas (foco desktop).
- Integração WhatsMiau.dev e disparo real de lembretes (segue como stub protegido).
- Cloudflare R2 (imagens), deploy no Railway, auth por telefone/OTP.
- Promoção de usuários a barbeiro/admin pela interface (continua via SQL).
