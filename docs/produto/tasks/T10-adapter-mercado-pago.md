# T10 — Adapter Mercado Pago (cartão recorrente)

| Campo | Valor |
|---|---|
| Fase | 2 |
| Iniciar após | T03 |
| Concluir requer | T05 (componente de cartão) |
| Gate humano | — (sandbox real em T38/H02) |
| Decisões | D0004, D0008, D0015 (webhook), D0018 (retentativas), D0021, D0030, D0039, D0042, D0052, D0054, D0056 |
| PRD | RN05, RN08, RN09, §7.6; pesquisa [22](../../pesquisas/22-mercado-pago-recorrente.md) |
| Área de escrita | `src/integrations/mercado-pago/**` (incluindo `ui/` para o campo seguro), rota `src/routes/api/webhooks/mercado-pago/**` |
| Não tocar | Regras de assinatura (T16), checkout (T20) |
| Paralelizável com | T09, T11, T12 |

## Objetivo

Implementar o `PaymentProvider` do cartão recorrente via API de Assinaturas (`preapproval`) do Mercado Pago, sem que o cartão passe pelo servidor, com webhooks verificados e tradução para eventos internos neutros.

## Ler antes

Pesquisa 22 inteira (atenção às contradições sobre tópicos de webhook e ao fato de `authorized` ≠ parcela paga); PRD §7.6; D0030 (contas por fase).

## Escopo

1. **Campo seguro:** componente React que carrega o SDK/Bricks do Mercado Pago e gera `card_token_id` no navegador (Public Key do ambiente). Nenhum dado de cartão no nosso servidor ou log.
2. **Operações (todas via `runExternalOperation`):**
   - `createRecurring({ assinaturaId, valor, cardToken, payerEmail, inicio })` → `POST /preapproval` com `external_reference = assinaturaId`, `status: authorized`, `auto_recurring` mensal BRL; **antes**, `GET /preapproval/search?external_reference=` para não duplicar.
   - `getRecurring(id)`, `searchByExternalReference`.
   - `cancelRecurring(id)` (`PUT status=canceled`).
   - `changeAmount(id, valor)` (`PUT auto_recurring.transaction_amount`) — usado por T24 na data correta.
   - `changeNextChargeDate(...)` — **somente se** H02 provar a capacidade; até lá `capabilities.changeNextChargeDate = 'unverified'`.
   - `getPayment(id)` (`/v1/payments/{id}`), `getAuthorizedPayment(id)` (`/authorized_payments/{id}`).
   - `refund(paymentId, chaveIdempotente)` (`X-Idempotency-Key`).
3. **Webhook:** verificação `x-signature` (manifesto com `data.id`, `x-request-id`, `ts`, segredo), persistência no inbox (T03), resposta 200 rápida; processamento: consultar o recurso conforme tópico (`payment`, `subscription_preapproval`, `subscription_authorized_payment`, chargebacks/claims se disponíveis) e emitir eventos **neutros**: `ProviderRecurringStatusChanged`, `ProviderPaymentObserved` (id, valor, moeda, status, `aprovado_em` do provedor, referência do período/parcela, `external_reference`), `ProviderPaymentReversed`, `ProviderDisputeOpened`.
4. **Qualificação de IDs:** todo id externo carrega `provedor=mercado_pago`, `conta` (id do vendedor) e `ambiente` (`test`/`prod`).
5. **Capacidades declaradas** (`provado`/`nao_suportado`/`nao_verificado`): mudar data da próxima cobrança, consultar instante de aprovação, devolver duplicata, eventos de reversão/contestação, alterar valor programado, dias 29–31.
6. **Fake conforme** + fixtures sanitizadas + suíte de contrato compartilhada.

## Fora do escopo

Estado da assinatura, obrigações e ciclos (T16); telas de checkout (T20).

## Contratos (publica)

`PaymentProvider` (cartão), `MercadoPagoCardField` (UI), eventos neutros acima, `capabilities`, fake.

## Regras e checklist defensivo

- Nunca usar o corpo do webhook nem o `back_url` como verdade; sempre consultar.
- Rejeitar evento com conta/ambiente diferentes dos configurados (ocorrência).
- Moeda ≠ BRL ou valor ≠ esperado → evento marcado `divergente` (T16 decide ocorrência).
- Timeout em criação → `incerta` → reconciliar via `search` antes de tentar de novo.

## Testes obrigatórios

- Verificação `x-signature`: válida, inválida, `ts` antigo.
- Criação idempotente: segunda chamada encontra a existente pelo `external_reference`.
- Parcela recusada em `recycling` não vira "pago"; `processed` com pagamento aprovado vira `ProviderPaymentObserved(aprovado)`.
- Ordem invertida de eventos não regride status.
- Refund com a mesma chave duas vezes → uma devolução.
- Fake e real (fixtures) na mesma suíte.

## Critérios de aceite

Adapter, componente e fake publicados; todas as capacidades marcadas `nao_verificado` até T38.

## Entrega

Relatório (PRD §11.5) com a lista de capacidades e o que T38 precisa provar.
