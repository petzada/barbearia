# T25 — Atendimento: desfecho (realizado/falta) e recebimentos avulsos

| Campo | Valor |
|---|---|
| Fase | 5 |
| Iniciar após | T17 |
| Concluir requer | — |
| Gate humano | — |
| Decisões | D0024 (sinalização mantida), D0025, D0029, D0053 (falta na suspensão), D0058, D0064 |
| PRD | RN04 (desfecho), RN10, §4.3 (B03), §6.2 (atendimento) |
| Área de escrita | `src/modules/attendance/{outcome,receivables}/**`, rotas `src/routes/equipe/atendimentos/**` (exceto o componente de concordância de T21 e a inclusão de T26) |
| Não tocar | Comissões (T27 consome o evento), correções (T28) |
| Paralelizável com | T18–T22 |

## Objetivo

Registrar o que aconteceu na cadeira, separado do que foi pago: o barbeiro marca realizado ou falta, registra recebimentos do avulso por forma de pagamento, e o sistema dispara o consumo do uso e a comissão sem confundir atendimento com caixa.

## Ler antes

PRD RN10, RN04; D0029, D0064.

## Escopo

1. **Tabelas:** `atendimentos` (reserva única, desfecho `realizado`/`falta`, `ocorrido_em` = início da reserva, registrado_em, registrador), `contas_receber` (atendimento, devido_centavos = soma dos itens avulsos preservados + inclusões de T26, estado calculado), `recebimentos` (conta, valor, forma `dinheiro`/`pix_loja`/`debito`/`credito`, data, autor, `estorno_de`).
2. **Pendências de desfecho:** reservas `confirmada` com `fim < agora` sem atendimento → lista "pendentes de confirmação" do barbeiro (próprios) e do admin (todos); job que cria/fecha pendências (T30) e alimenta o painel (T34).
3. **Registrar desfecho** (`attendance.finalize`, barbeiro dono ou admin, idempotente, primeiro desfecho único):
   - **realizado:** reserva `realizada`; `entitlements.consume` se coberta; conta a receber criada para a parte avulsa; evento `AttendanceFinalized` (T27 gera comissão); não exige recebimento.
   - **falta:** reserva `falta`; coberta com ciclo pago → `consume` + sinalização no CRM (evento `NoShowFlagged`); coberta sem ciclo pago (suspensão) → não consome (T15), sinaliza; avulsa → sem custo, conta a receber cancelada.
   - se houver **escolha de cobertura aberta** (T21), o realizado exige antes a concordância de balcão (componente de T21).
   - registrar antes do início → `ATTENDANCE.NOT_STARTED`.
4. **Recebimentos** (`attendance.recordReceipt`): valor > 0, soma ≤ devido (`ATTENDANCE.RECEIPT_EXCEEDS_DUE`; excedente real vira ocorrência de caixa com motivo), forma obrigatória; estorno = lançamento negativo referenciando o original (só admin). Estado pendente/parcial/quitado calculado.
5. **Tela B03:** lista do dia (a atender, em andamento, pendentes de desfecho); detalhe com itens (coberto/avulso, valores), botões realizado/falta com confirmação, registro de recebimentos (teclado numérico, formas), saldo devedor visível, histórico do cliente mínimo (faltas recentes).
6. **Leituras para financeiro:** recebimentos por data e forma; contas pendentes.

## Fora do escopo

Inclusão de serviço (T26), comissões (T27), correções de desfecho (T28).

## Contratos (publica)

`attendance.finalize/recordReceipt/reverseReceipt`, leituras de pendências e caixa, eventos `AttendanceFinalized{desfecho, itens}`, `NoShowFlagged`, `ReceiptRecorded`.

## Regras e checklist defensivo

- Segundo desfecho pelo barbeiro → recusado (correção só pelo admin em T28).
- Barbeiro só finaliza os próprios atendimentos.
- Parte coberta nunca gera conta a receber nem receita.
- Valores em centavos; nenhum arredondamento no caixa.

## Testes obrigatórios

- Realizado com recebimento zero, parcial e total: estados corretos; comissão disparada nos três.
- Coberto: nenhum valor a receber; uso consumido uma única vez mesmo com job de comprometimento concorrente.
- Falta coberta com ciclo pago consome e sinaliza; falta na suspensão não consome.
- Recebimento acima do devido rejeitado; estorno só por admin.
- Desfecho duplicado (dois cliques, dois dispositivos) → um registro.
- E2E: barbeiro confirma atendimento misto e registra Pix da barba.

## Critérios de aceite

Tela B03 completa; eventos com payload documentado para T27/T34.

## Entrega

Relatório (PRD §11.5).
