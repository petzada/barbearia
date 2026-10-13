# T22 — Devoluções, reversões, contestações, ocorrências e conciliação

| Campo | Valor |
|---|---|
| Fase | 5 |
| Iniciar após | T16 |
| Concluir requer | — |
| Gate humano | — (eventos reais dos provedores provados em T38) |
| Decisões | D0052, D0054, D0055, D0068 |
| PRD | RN05 (duplicata), RN07 (reversão), RN08 (pós-pedido), §7.6, §4.3 (D08 ocorrências) |
| Área de escrita | `src/modules/billing/{refunds,reversals,occurrences,reconciliation}/**`, rotas `src/routes/admin/financeiro/ocorrencias/**` |
| Não tocar | Núcleo de assinatura (usa `revokeCycleSupport` de T16), adapters |
| Paralelizável com | T18, T19, T20, T25 |

## Objetivo

Tudo o que é dinheiro "fora do caminho feliz" fica rastreável e resolvido: cobranças duplicadas e posteriores ao pedido de cancelamento são devolvidas; reversões reavaliam cobertura; contestações viram pendência; pagamentos estranhos viram ocorrências; e uma conciliação periódica pega o que os webhooks perderam.

## Ler antes

PRD RN05, RN07, RN08, §7.6; D0052, D0054, D0055.

## Escopo

1. **Devoluções:** `devolucoes` (pagamento, motivo `duplicata`/`pos_cancelamento`/`admin`, valor, estado `solicitada`/`processando`/`concluida`/`falhou`, chave idempotente, operação externa). Handlers: `PaymentDuplicated` e `PaymentAfterCancellation` (T16) → devolução automática via `PaymentProvider.refund` (`runExternalOperation`); falha → pendência do admin. Devolução não altera ciclos nem usos (a cobrança devolvida nunca gerou ciclo).
2. **Devolução manual pelo admin** (desktop, auth recente, motivo): para pagamentos de assinatura quando aplicável; separada de ajustes contábeis.
3. **Reversões:** `ProviderPaymentReversed` confirmado → registrar, `subscriptions.revokeCycleSupport` (T16), e as reservas futuras seguem a escolha de cobertura (T21, causa `reversao`). Realizados mantêm histórico; nenhuma comissão retirada automaticamente; pendência para o admin analisar.
4. **Contestações:** `ProviderDisputeOpened` → ocorrência `contestacao` + pendência; nenhum efeito em cobertura até virar reversão confirmada.
5. **Ocorrências:** `ocorrencias_pagamento` (tipo `duplicata`, `orfao`, `divergente`, `reversao`, `contestacao`, `cancelamento_externo_divergente`, `capacidade_ausente`; estado; resolução com motivo). Pagamento órfão (sem assinatura/checkout) e divergente (valor/moeda/conta) entram aqui.
6. **Conciliação periódica** (job diário e sob demanda): para cada assinatura não encerrada e cada operação `incerta`, consultar o provedor (recorrência, últimos pagamentos, devoluções) e comparar com o estado local; diferenças → reprocessar pelo mesmo caminho dos webhooks (idempotente) ou abrir ocorrência. Também usada pelo modo recuperação (T39).
7. **Tela D08-ocorrências:** lista filtrável, detalhe com linha do tempo (inbox, operações, pagamentos), ações: reprocessar, devolver, marcar resolvida com motivo.

## Fora do escopo

Financeiro agregado e painel (T34), cancelamento (T23).

## Contratos (publica)

`refunds.request/status`, `occurrences.open/resolve/list`, `reconciliation.runFor(assinatura|operacao)`, `reconciliation.runAll(desde)`, eventos `RefundCompleted|Failed`, `OccurrenceOpened`.

## Regras e checklist defensivo

- Uma devolução por (pagamento, motivo); repetir o pedido devolve o mesmo registro.
- Timeout no refund → `incerta` → consultar antes de repetir.
- Conciliação nunca "corrige" apagando registros: só aplica eventos ou abre ocorrência.

## Testes obrigatórios

- Duplicata → uma devolução, mesmo com webhook repetido.
- Pagamento pós-pedido de cancelamento → devolução, sem ciclo.
- Reversão com outro pagamento válido no ciclo → sem suspensão; sem outro → suspensão + escolhas.
- Contestação → só pendência.
- Webhook perdido: conciliação encontra pagamento aprovado e aplica uma única quitação.
- Refund com timeout → reconciliação descobre sucesso, sem segunda devolução.

## Critérios de aceite

Fluxos provados com fakes; tela de ocorrências funcional; conciliação reutilizável por T39.

## Entrega

Relatório (PRD §11.5).
