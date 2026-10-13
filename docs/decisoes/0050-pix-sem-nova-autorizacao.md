# 0050 — Pix sem nova autorização: troca não acontece; reajuste cancela

- **Data:** 2026-10-13
- **Status:** aceita (detalhada por [0056](0056-troca-de-recorrencia-programada.md) e [0063](0063-notificacao-nao-e-aceite.md))
- **Substitui:** a regra de Pix sem autorização de [0039](0039-troca-de-plano-no-proximo-ciclo.md) (que mandava para a inadimplência)
- **Detalha:** [0042](0042-reajuste-de-plano-para-todos-com-30-dias.md)

## Contexto
A mesma situação, "cliente de Pix não autorizou o novo valor", tinha duas regras diferentes: na troca de plano levava à inadimplência (0018), e no reajuste levava ao cancelamento no fim do ciclo. A autorização antiga continua válida no valor antigo até alguém cancelá-la.

## Decisão
- **Troca de plano** sem a nova autorização até a data → **a troca não acontece**. O cliente **segue no plano antigo**, com a autorização antiga, e é avisado no WhatsApp e no app.
- **Reajuste de preço** sem a nova autorização até a data → a assinatura é **cancelada no fim do ciclo** ([0042](0042-reajuste-de-plano-para-todos-com-30-dias.md)), porque o preço antigo deixou de existir.

## Consequências
- Na troca de plano por Pix, a autorização antiga só é cancelada depois que a nova é confirmada, e a substituição é programada para a próxima renovação ([0056](0056-troca-de-recorrencia-programada.md)).
- Horários futuros marcados para o ciclo seguinte considerando o plano novo voltam às regras do plano antigo. ~~Com aviso.~~ → Se a cobertura mudar, o cliente escolhe de novo ([0063](0063-notificacao-nao-e-aceite.md)).

## Revisão adversarial (2026-10-13)
- Regras mantidas. Aceite quando a cobertura muda ([0063](0063-notificacao-nao-e-aceite.md)); recorrência programada ([0056](0056-troca-de-recorrencia-programada.md)).
