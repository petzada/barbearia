# T16 — Núcleo de assinatura: estados, obrigações, ciclos e pagamentos

> **Atualização 2026-10-13:** H01-Q4 respondido → [D0086](../../decisoes/0086-regularizacao-de-mensalidade.md) (inclui baixa no balcão pelo admin com motivo e auth recente). Ramo desbloqueado.

| Campo | Valor |
|---|---|
| Fase | 4 |
| Iniciar após | T15 |
| Concluir requer | — |
| Gate humano | **H01-Q4** (ramo: regularização manual); capacidades dos provedores em T38/H02 |
| Decisões | D0004, D0008, D0018, D0025, D0052, D0053 (suspensão no fim), D0055 (cobrança pós-pedido), D0080 |
| PRD | RN05, RN07 (início), §6.2 (assinaturas), §6.3, §7.5, §7.6 |
| Área de escrita | `src/modules/subscriptions/{core,timeline}/**`, `src/modules/billing/{payments,obligations}/**` |
| Não tocar | Adapters (T10/T11), checkout (T20), devoluções (T22), cancelamento (T23) |
| Paralelizável com | T17 |

## Objetivo

A camada de assinatura independente de gateway: estado local, obrigações com identidade, uma quitação por obrigação, ciclos mensais com âncora, pagamento atrasado iniciando novo ciclo, suspensão só no fim do período pago e encerramento por retentativas esgotadas. Implementa o `SubscriptionTimeline` usado por T15.

## Ler antes

PRD RN05, §6.3, §7.5–§7.6; D0052, D0080; contratos de T10/T11 (eventos neutros).

## Escopo

1. **Tabelas:** `assinaturas` (cliente, plano, versão, estado, `dia_ancora`, `renovacao_habilitada`, provedor, recorrência atual, revisão), `obrigacoes` (assinatura, sequência, vencimento local, valor esperado, estado `aberta`/`quitada`/`dispensada`), `ciclos` (assinatura, obrigação, início, fim, versão de plano, origem `primeiro`/`em_dia`/`atrasado`), `pagamentos` (provedor, conta, ambiente, id externo **único**, obrigação, valor, moeda, status, `aprovado_em` do provedor, classificação `quitacao`/`duplicata`/`pos_cancelamento`/`orfao`/`divergente`), `recorrencias` (provedor, id externo, estado, responsável pela próxima obrigação).
2. **Criação:** `subscriptions.create(ctx, { clienteId, planoId, versaoId, provedor })` → `pendente_ativacao` + obrigação 1 `aberta` (chamado por T20).
3. **Aplicar pagamento** (handler dos eventos neutros `ProviderPaymentObserved`, com lock da assinatura):
   - consultar estado já resolvido pelo adapter; ignorar não aprovados (exceto registrar recusa);
   - identificar a obrigação (referência de período do provedor; senão a obrigação aberta mais antiga);
   - validar moeda/valor/conta/ambiente → senão `divergente` + ocorrência (T22);
   - obrigação já quitada → `duplicata` + evento `PaymentDuplicated` (T22 devolve);
   - renovação desabilitada por pedido de cancelamento e o ciclo começaria depois do pedido → `pos_cancelamento` + evento (T22 devolve) (D0055);
   - caso normal → quitar; criar ciclo: primeiro ou atrasado → `início = aprovado_em` e nova âncora (dia local da aprovação); em dia → `início = fim anterior`, mesma âncora; `fim = addMonthsAnchored`; criar a obrigação seguinte; chamar `entitlements.materializeCycle`; estado `ativa`; agendar job de fim de ciclo.
   - atrasado → evento `CycleStartedLate` (T21 recalcula escolhas) e operação externa `changeNextChargeDate` **somente se** a capacidade estiver `provado`; senão pendência de integração explícita.
4. **Recusa antes do fim:** evento `ChargeRefusedBeforeEnd` (aviso + pendência via T21/T31), sem mudança de estado.
5. **Fim do ciclo** (job no instante `fim`, idempotente; leituras de cobertura sempre usam a tabela `ciclos`, nunca o estado): sem ciclo seguinte → `suspensa` (renovação habilitada) ou `cancelada` (se `cancelada_no_fim_do_ciclo`); evento `SubscriptionSuspended` / `SubscriptionEnded`.
6. **Retentativas esgotadas:** sinal do provedor (ou política com prazo provado em H02) → operação externa de cancelamento + `cancelada` + aviso; evento `SubscriptionEnded(retentativas_esgotadas)`.
7. **Reativação:** pagamento aprovado durante `suspensa` → passo 3 (atrasado).
8. **Revogar suporte de ciclo** `subscriptions.revokeCycleSupport(cicloId, motivo)` (chamado por T22 em reversão confirmada): se nenhum outro pagamento válido sustenta o ciclo → benefícios restantes suspensos (`suspensa`) e evento `CycleSupportRevoked`.
9. **`SubscriptionTimeline`** real para T15 (inclui projeção dos próximos ciclos pela âncora e versão de plano programada por T24, quando existir).
10. **Pedido de cancelamento** é de T23; aqui apenas o campo `renovacao_habilitada` e o estado `cancelada_no_fim_do_ciclo` respeitados no fluxo.

## Fora do escopo

Checkout e vagas (T20), devoluções e conciliação (T22), cancelamento (T23), troca/reajuste (T24), telas.

## Contratos (publica)

`subscriptions.create/get/forClient`, `SubscriptionTimeline`, `revokeCycleSupport`, handlers de pagamento, eventos `CycleStarted`, `CycleStartedLate`, `ObligationSettled`, `PaymentDuplicated`, `PaymentAfterCancellation`, `PaymentDivergent`, `ChargeRefusedBeforeEnd`, `SubscriptionActivated|Suspended|Reactivated|Ended`.

## Regras e checklist defensivo

- Autorização/checkout/redirect nunca ativam.
- UNIQUE por pagamento externo qualificado; constraint de uma quitação por obrigação.
- Evento fora de ordem (ex.: recusa chegando depois da aprovação) não regride.
- Instante de aprovação é o do provedor, nunca o de recebimento do webhook.

## Testes obrigatórios

- Primeira aprovação ativa e cria ciclo com âncora do dia da aprovação.
- Renovação em dia mantém âncora (31/01 → 28/02 → 31/03).
- Pagamento 3 dias atrasado: novo ciclo a partir da aprovação, nova âncora, usos integrais, avulsos anteriores intactos.
- Duplicata (mesmo evento duas vezes; dois eventos diferentes para o mesmo pagamento; dois provedores na mesma obrigação) → uma quitação.
- Pagamento de ciclo iniciado depois do pedido de cancelamento → `pos_cancelamento`, sem ciclo.
- Recusa antes do fim não suspende; fim sem pagamento suspende no instante exato.
- Webhook atrasado não altera o instante.
- Moeda/conta divergente → ocorrência, sem quitação.

## 🛑 Handoff humano (H01-Q4)

O ramo de **regularização manual** (cobrança imediata ligada à obrigação, atualização de cartão com nova tentativa, ou registro manual pelo admin) depende de H01-Q4 **e** das capacidades provadas em T38. Antes de implementá-lo:

- **H01-Q4 respondida:** implementar a opção escolhida atrás de flag `regularizacao_manual`, ligada só quando T38 provar a capacidade.
- **Não respondida:** **PARAR este ramo**, deixar o ponto de extensão `RegularizationMethod` com erro `SUBSCRIPTIONS.REGULARIZATION_PENDING_H01`, marcar `blocked_human (H01-Q4)` informando que o núcleo está entregue e enviar a mensagem padrão. A regularização por retentativa automática do provedor já funciona sem esse ramo.

## Critérios de aceite

Núcleo verde com fakes de T10/T11; `SubscriptionTimeline` consumido por T15 em teste de integração.

## Entrega

Relatório (PRD §11.5) com diagrama de estados e lista de dependências de capacidade.
