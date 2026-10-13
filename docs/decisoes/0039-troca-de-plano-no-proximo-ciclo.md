# 0039 — Troca de plano vale no próximo ciclo

- **Data:** 2026-10-13
- **Status:** aceita (Pix sem autorização em [0050](0050-pix-sem-nova-autorizacao.md); aceite dos horários em [0063](0063-notificacao-nao-e-aceite.md); recorrência em [0056](0056-troca-de-recorrencia-programada.md))

## Contexto
No Pix Automático o valor é fixo na autorização. Troca no meio do ciclo exigiria cálculo proporcional nos dois gateways, que é onde nascem cobranças duplicadas (`docs/pesquisas/20-objecoes.md`).

## Decisão
- O cliente (ou o admin, [0040](0040-acoes-do-admin-sobre-assinaturas.md)) **agenda a troca de plano**. O ciclo atual segue no plano antigo, e a **próxima cobrança já vem no plano novo**.
- **Cartão:** o app altera o valor da assinatura no Mercado Pago.
- **Pix:** o cliente **autoriza a nova recorrência** no banco antes da data da próxima cobrança. ~~Se não autorizar, segue a regra de falha de renovação (0018).~~ → Se não autorizar, **a troca não acontece** e ele segue no plano antigo ([0050](0050-pix-sem-nova-autorizacao.md)).
- **Sem cálculo proporcional** no MVP.

## Consequências
- Horários futuros marcados para o ciclo seguinte passam a seguir as regras do plano novo (ex.: PREMIUM → GOLD: horários fora de terça e quarta perdem cobertura). ~~O cliente é avisado.~~ → Antes de confirmar a troca, o cliente vê os horários afetados e escolhe manter como avulso, com aceite, ou cancelar sem penalidade ([0063](0063-notificacao-nao-e-aceite.md)).

## Revisão adversarial (2026-10-13)
- Mantida. Aceite dos horários afetados antes de confirmar a troca ([0063](0063-notificacao-nao-e-aceite.md)); recorrência programada para a próxima renovação ([0056](0056-troca-de-recorrencia-programada.md)).
