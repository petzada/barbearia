# T15 — Ledger de direitos: usos, alocações, limites e créditos de reposição

> **Atualização 2026-10-13:** H01-Q2 respondido → [D0084](../../decisoes/0084-excesso-no-ciclo-e-ordem-de-consumo.md). Ramo desbloqueado.

| Campo | Valor |
|---|---|
| Fase | 3 |
| Iniciar após | T07, T03 |
| Concluir requer | — |
| Gate humano | **H01-Q2** (ramo: excesso após deslocamento de ciclo; ordem crédito × ciclo) |
| Decisões | D0025, D0026, D0040, D0053, D0058, D0059, D0060, D0081 |
| PRD | RN03 (quatro controles), RN04, §5.15 (INT-01, INT-02, INT-05), §6.2 (direitos), §6.3 |
| Área de escrita | `src/modules/entitlements/**` |
| Não tocar | Assinaturas (T16 implementa o port `SubscriptionTimeline` definido aqui) |
| Paralelizável com | T13, T14 |

## Objetivo

Um livro-razão de direitos que responde, sem ambiguidade e sob concorrência: quantos usos o cliente tem para uma data, de onde vem cada uso, em que etapa ele está, e se uma nova reserva cabe nos limites. Nenhum uso é descontado duas vezes; nenhum direito nasce sem origem.

## Ler antes

PRD RN03, RN04, §6.3; D0058, D0059, D0060.

## Escopo

1. **Port `SubscriptionTimeline`** (implementado por T16; fake aqui): para um cliente e instante → assinatura, estado, versão de plano aplicável, ciclo pago que contém o instante ou ciclo projetado (sequência, início, fim) e se a renovação está habilitada.
2. **Tabelas:** `direitos` (cliente, assinatura, origem `ciclo`/`cortesia`/`credito`, chave do ciclo (pago ou projetado), quantidade, válido de/até, versão de plano das condições, estado `previsto`/`pago`/`expirado`/`revogado`); `alocacoes_uso` (reserva, direito, estado `prevista`/`reservada`/`comprometida`/`consumida`/`liberada`/`substituida`, instantes, motivo; **índice único parcial: uma alocação efetiva por reserva**); `movimentos_direito` (append-only); `creditos_reposicao` (direito do crédito, alocação substituída única, reserva causa, validade, reinícios).
3. **`coverageContext(ctx, clienteId, instante)`** para T13: fonte de uso disponível (ciclo pago, ciclo projetado → previsão, crédito válido) ou motivo de indisponibilidade; inclui verificação de janela (`janela_dias` da versão) e de limite de reservas de plano.
4. **Operações (todas dentro da transação do chamador, com lock por cliente):**
   - `allocate(reservaId, fonte)` → `prevista` (ciclo projetado) ou `reservada` (pago/crédito). Cria o direito `previsto` do ciclo projetado sob demanda.
   - `commit(reservaId)` → `comprometida` (idempotente; INT-01: derivado de `agora ≥ deadline`). Job `entitlements.commitDue` materializa periodicamente.
   - `consume(reservaId, desfecho)` → `consumida` (realizado/falta). Se a alocação for `prevista` (ciclo não pago) e a falta ocorre na suspensão → **não consome** (D0053): `liberada` com motivo `falta_sem_ciclo_pago`.
   - `release(reservaId, 'cancelamento_no_prazo')` → `liberada`; crédito volta com validade original.
   - `consumeLate(reservaId)` → `consumida` com motivo `cancelamento_tardio`.
   - `substituteWithCredit(reservaId, agora)` (casa cancela, benefício pago) → alocação `substituida` + crédito (30 dias, condições da versão original); se a alocação era de crédito → **mesmo** crédito com 30 dias reiniciados; se `prevista` → só `liberada`, sem crédito.
   - `grantCourtesy(cliente, cicloAtual, motivo, admin)` → direito `cortesia` (quantidade 1, validade do ciclo vigente); **não** altera limites.
   - `adminReturn(alocacaoId, motivo, admin)` → ramo **H01-Q5** (ver handoff); implementar só a validação de ciclo vigente até a decisão.
   - `materializeCycle(assinatura, cicloPago)` (chamado por T16 na quitação): direito `pago` com validade exata; alocações `prevista` cujas reservas caem no ciclo viram `reservada`/`comprometida` até a quantidade; as que não caem são reavaliadas contra a nova projeção; **excedentes → ramo H01-Q2** → evento `CoverageLost` (T21 abre escolha).
   - `expireCycle(direito)` no fim do ciclo: saldo não usado expira (sem acúmulo).
5. **Quatro controles** — `checkLimits(clienteId, { coberta, origem, justificativa? })`:
   1. saldo da fonte ≥ 1;
   2. reservas futuras com alocação efetiva da assinatura < `limite_reservas_simultaneas` da versão;
   3. reservas futuras do cliente (plano + avulso, inclusive mantidas na suspensão) < limite geral; equipe pode exceder com justificativa (registrada pelo chamador);
   4. (teto é de T20).
   Retorna qual controle falhou com código `ENTITLEMENTS.*`.
6. **Saldo** = quantidade − alocações (prevista, reservada, comprometida, consumida) — sempre calculado; projeção materializada opcional e reconstruível.
7. **Leituras para telas:** saldo por ciclo, previsão da renovação, créditos com validade, histórico de movimentos.

## Fora do escopo

Estados de assinatura e pagamentos (T16), regras de escolha de cobertura (T21), telas (T32/T33).

## Contratos (publica)

`SubscriptionTimeline` (port), `coverageContext`, `allocate/commit/consume/release/consumeLate/substituteWithCredit/grantCourtesy/materializeCycle/expireCycle`, `checkLimits`, leituras, eventos `EntitlementAllocated|Committed|Consumed|Released|Substituted`, `CoverageLost`, `CourtesyGranted`.

## Regras e checklist defensivo

- Lock por cliente (`SELECT … FOR UPDATE` numa linha de controle do cliente) antes de qualquer alocação.
- Transições condicionais (`UPDATE … WHERE estado = esperado`) e verificação de linhas afetadas.
- Crédito nunca coexiste com a devolução do uso original.
- Cortesia nunca aumenta limites.

## Testes obrigatórios

- Último uso disputado por duas reservas simultâneas → uma `ENTITLEMENTS.NO_BALANCE`.
- `commit` (job) × `consume` (desfecho) simultâneos → um consumo.
- Cancelar no prazo devolve; no instante exato do prazo já é tardio.
- Casa cancela pago → crédito 30 dias; cliente cancela a reserva do crédito no prazo → mesmo crédito, validade original; casa cancela de novo → mesmo crédito, 30 dias reiniciados; sem duplicação.
- Casa cancela previsão → liberada, sem crédito.
- Falta na suspensão (alocação prevista) → não consome.
- Cortesia: saldo 5, limite de reservas continua 4.
- Limite geral: quatro futuras (uma avulsa) → quinta bloqueada para cliente; equipe com justificativa passa.
- `materializeCycle` com previsões dentro e fora do novo ciclo.

## 🛑 Handoff humano (H01-Q2)

Antes de implementar a **distribuição de excedentes** em `materializeCycle` e a **escolha entre crédito e saldo do ciclo**, verificar em [handoffs/registro.md](../handoffs/registro.md) e em docs/decisoes se H01-Q2 foi respondida.

- **Respondida:** implementar a opção escolhida e os testes correspondentes.
- **Não respondida:** **PARAR este ramo.** Implementar só o ponto de extensão (`ExcessPolicy`, `SourceOrderPolicy`) que lança `ENTITLEMENTS.POLICY_PENDING_H01`; deixar os testes como `todo` com o nome do cenário; marcar a task `blocked_human (H01-Q2)` informando que todo o resto está entregue; enviar a mensagem padrão relembrando a pergunta. Não escolher uma opção por conta própria.

## Critérios de aceite

Todos os testes verdes (exceto os `todo` do ramo H01, se pendente); README do módulo com diagrama de estados das alocações.

## Entrega

Relatório (PRD §11.5).
