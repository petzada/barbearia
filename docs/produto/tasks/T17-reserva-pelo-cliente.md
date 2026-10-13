# T17 — Reserva pelo cliente (fluxo Agendar)

| Campo | Valor |
|---|---|
| Fase | 4 |
| Iniciar após | T13, T14, T15 |
| Concluir requer | T04, T05 |
| Gate humano | — |
| Decisões | D0025, D0026, D0027, D0035, D0036, D0058, D0060, D0063, D0074 |
| PRD | RN03, RN04, RN14, §4.1, §4.3 (C02), §7.4, §7.5 |
| Área de escrita | `src/modules/scheduling/reservations/{create,read}/**`, `src/modules/scheduling/reservations/schema.ts`, rotas `src/routes/app/agendar/**` |
| Não tocar | Cancelar/remarcar (T18), equipe (T19) |
| Paralelizável com | T16 |

## Objetivo

O cliente logado escolhe serviços, horário e barbeiro, vê exatamente o que vai consumir e pagar, e confirma; o servidor revalida tudo numa única transação e grava a reserva com valores e prazo congelados.

## Ler antes

PRD RN03, RN04, RN14, §4.1; contratos de T13, T14, T15.

## Escopo

1. **Tabelas:** `reservas` (cliente, barbeiro, início, fim, estado, origem, `cancel_deadline`, `nasceu_comprometida`, cotação/hash aceito, `pedido_pelo_cliente` (para T19), justificativa de limite, revisão), `reserva_itens` (serviço, combo pai, coberto, preço avulso, referência, versão de plano), `reserva_eventos` (append-only).
2. **Comando `reservations.create`** (`defineCommand`, cliente dono, idempotente):
   1. `pricing.verify` (cotação atual com hash igual; senão `QUOTE_STALE` + nova cotação);
   2. lock do cliente; `entitlements.checkLimits`;
   3. inserir reserva e itens (snapshots);
   4. `occupancy.occupy` (constraint) → `SLOT_UNAVAILABLE` com alternativas de `availability.nearest`;
   5. `entitlements.allocate` (se coberta);
   6. registrar **aceite** (RN14) quando houver parte avulsa ou nascer comprometida;
   7. auditoria + outbox `ReservationConfirmed` (com dados para T31 e T30);
   tudo na mesma transação.
3. **Leituras:** minhas reservas (futuras/passadas), detalhe com itens, cobertura, uso, prazo e estado.
4. **Tela C02:** passo 1 serviços (combos sugeridos, preços e duração do catálogo); passo 2 data e horários (grade, carregamento por dia, filtro opcional por barbeiro); passo 3 barbeiros livres no horário (foto, nome), ou "mais próximo disponível" quando ninguém está livre; passo 4 revisão com todos os avisos da cotação (combo aplicado, parte avulsa e valor "pago na barbearia", uso consumido, previsão condicionada à renovação, prazo sem perda com data/hora completa, nasce comprometida); passo 5 confirmação com resumo e ações (ver reserva, voltar ao início).
5. **Erros na UI:** `SLOT_UNAVAILABLE` mostra alternativas; `QUOTE_STALE` mostra a nova cotação para nova concordância; limites mostram o motivo e o que fazer ("cancele ou aguarde uma reserva sair").
6. **Métricas:** `booking_started`, `booking_step`, `booking_confirmed`, `booking_conflict` (sem PII).

## Fora do escopo

Cancelar/remarcar (T18), marcar pela equipe (T19), mensagens (T31 consome o evento).

## Contratos (publica)

`reservations.create`, `reservations.get/listForClient`, `ReservationConfirmed` (payload versionado: reservaId, clienteId, barbeiroId, início, deadline, itens resumidos, origem, pedidoPeloCliente), tabelas de reserva para T18/T19/T25.

## Regras e checklist defensivo

- Cliente não escolhe preço, cobertura nem prazo; só ids e instante.
- Idempotência por chave do comando (clique duplo, rede instável).
- `expectedRevision` não se aplica à criação, mas a idempotência sim.
- Barbeiro desabilitado entre cotar e confirmar → erro tipado.

## Testes obrigatórios

- Integração: duas confirmações concorrentes para o mesmo barbeiro/horário → uma confirmada, outra `SLOT_UNAVAILABLE` com alternativas.
- Último uso disputado por duas reservas em barbeiros diferentes → uma vira erro de saldo.
- Preço alterado entre cotar e confirmar → `QUOTE_STALE`, nada gravado.
- Reserva coberta grava referência e prazo; avulsa grava preço e aceite com hash.
- Reserva em ciclo projetado → alocação `prevista`.
- Rollback total se qualquer passo falhar (sem ocupação órfã).
- E2E mobile: BLACK marca corte + barba e vê a barba como avulsa com valor; GOLD numa sexta vê tudo avulso; filtro por barbeiro; conflito simulado mostra alternativas.

## Critérios de aceite

Fluxo C02 completo nos dois viewports; testes de concorrência verdes; evento publicado com payload documentado.

## Entrega

Relatório (PRD §11.5) com prints do fluxo.
