# T14 — Agenda: jornada, bloqueios, ocupação e disponibilidade

| Campo | Valor |
|---|---|
| Fase | 3 |
| Iniciar após | T06, T03 |
| Concluir requer | T05 |
| Gate humano | — |
| Decisões | D0032, D0033, D0035, D0036, D0037, D0044 (aviso de bloqueio), D0069, D0074 |
| PRD | RN03, §4.3 (B01, D03-visualização, D07), §6.2 (agenda), §7.5 |
| Área de escrita | `src/modules/scheduling/{schedule,occupancy,availability}/**`, rotas `src/routes/equipe/agenda/**` (visualização e bloqueio), `src/routes/admin/jornadas/**`, `src/routes/admin/agenda/**` (visualização) |
| Não tocar | Reservas (T17/T18), cotação (T13) |
| Paralelizável com | T07, T13, T15 |

## Objetivo

Modelar a capacidade de cada barbeiro (jornada, intervalos, bloqueios, exceções), garantir no banco que nada se sobrepõe e responder com rapidez "quais horários e quais barbeiros estão livres" para o fluxo serviço → horário → barbeiro, com filtro opcional.

## Ler antes

PRD RN03 e §7.5; D0032, D0069, D0074; skill/guia de Postgres para constraints de exclusão.

## Escopo

1. **Jornadas:** `jornadas` (barbeiro, dia da semana, início/fim locais), `jornada_intervalos`; versão/vigência por data de início para não reescrever o passado.
2. **Bloqueios:** `bloqueios` (barbeiro, início, fim, motivo, autor, estado). Barbeiro cria só no próprio e só em livre; admin em qualquer; admin desfaz. Evento `BlockCreated` (T30 notifica admin).
3. **Exceções:** `excecoes_jornada` (barbeiro, intervalo, motivo, autor, reserva relacionada) para "manter como exceção" e para criação fora da jornada pelo admin (INT-08).
4. **Ocupações:** `ocupacoes` (barbeiro, `periodo tstzrange` `[)`, tipo `reserva`/`bloqueio`, recurso_id, ativo) com `EXCLUDE USING gist (barbearia_id WITH =, barbeiro_id WITH =, periodo WITH &&) WHERE (ativo)` (SQL manual em `sql/`). API `occupancy.occupy(tx, …)` e `occupancy.release(tx, …)` usada por T17/T18 dentro das transações deles; violação → `SCHEDULING.SLOT_UNAVAILABLE`.
5. **Disponibilidade:** `availability.search({ servicosExpandidos, duracaoMin, de, ate, barbeiroId?, origem, agora, parametros })` →
   - slots na grade de 30 min (alinhados à meia-noite local), dentro da jornada − intervalos − bloqueios − ocupações − exceções de fechamento;
   - só barbeiros habilitados para todos os itens (`isEnabledForAll`, T06);
   - antecedência mínima (cliente) e horizonte (janela);
   - resposta: por slot, lista de barbeiros livres; com `barbeiroId`, só os slots dele.
   - `availability.nearest(...)`: primeiro slot/barbeiro disponível a partir do horário pedido (D0036), no horizonte.
6. **Mudança de jornada (D0069):** `previewScheduleChange(barbeiro, novaJornada)` lista reservas futuras que ficariam fora; aplicar exige uma resolução por conflito. Esta task implementa **"manter como exceção"**; as resoluções "transferir" e "cancelar pela casa" são pontos de extensão preenchidos por T18 (desabilitadas até lá, com rótulo).
7. **Telas:** B01 agenda (dia/semana, própria para barbeiro, seletor de barbeiro para admin; cartões com primeiro nome do cliente, serviços, estado, selo plano/avulso; criar bloqueio); D07 jornadas (editor semanal, prévia de conflitos antes de salvar); D03 visualização de todas as agendas (ações vêm de T18/T19).
8. **Desempenho:** índices por (barbearia, barbeiro, período); consulta de disponibilidade limitada a 31 dias; medir p95 com seed de 5 barbeiros e 30 dias cheios (meta técnica: < 300 ms local).

## Fora do escopo

Criar/cancelar reservas (T17/T18/T19), cotação (T13).

## Contratos (publica)

`occupancy.occupy/release`, `availability.search/nearest`, `schedule.previewChange/applyChange` (com ponto de extensão de resolução), `blocks.create/undo`, evento `BlockCreated`, `ScheduleChanged`.

## Regras e checklist defensivo

- Bloqueio do barbeiro sobre reserva existente → rejeitado pela constraint e com mensagem "peça ao admin".
- Intervalo `[)`: reserva das 10:00–10:30 e outra às 10:30 são válidas.
- Disponibilidade é proposta: quem confirma revalida (T17).
- Datas e horas sempre via utilitários de tempo de T02.

## Testes obrigatórios (Postgres real)

- Duas transações concorrentes ocupando o mesmo barbeiro/intervalo → uma falha com `SLOT_UNAVAILABLE`.
- Bloqueio × reserva concorrentes → apenas um.
- Encaixe fora da grade (10:15) sem sobreposição aceito pela ocupação.
- Jornada com intervalo de almoço não oferece slots no intervalo.
- Serviço de 60 min não aparece às 17:30 numa jornada que termina 18:00.
- Filtro por barbeiro respeita habilitação de combo e componentes.
- `nearest` encontra o próximo dia quando o dia pedido está cheio.
- Prévia de mudança de jornada lista exatamente as reservas afetadas.
- Autorização: barbeiro não bloqueia agenda alheia nem vê clientes de outros barbeiros.

## Critérios de aceite

Constraint provada; disponibilidade correta e dentro da meta; telas B01/D07 funcionais.

## Entrega

Relatório (PRD §11.5) com a medição de desempenho.
