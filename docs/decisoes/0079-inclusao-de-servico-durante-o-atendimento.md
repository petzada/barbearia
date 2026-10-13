# 0079 — Inclusão de serviço durante o atendimento, com aceite da parte avulsa

- **Data:** 2026-10-13
- **Status:** aceita, parcialmente substituída por [0083](0083-inclusao-de-servico-pelo-preco-avulso.md)
- **Origem:** lacuna deixada pela revisão adversarial (Q43: "não definiu fluxo para inclusão posterior de serviços")
- **Detalha:** [0027](0027-cobertura-do-plano-e-parte-avulsa.md), [0063](0063-notificacao-nao-e-aceite.md), [0065](0065-combo-equivalente-automatico.md), [0066](0066-valores-preservados-na-reserva.md)

## Contexto
O cliente marca um serviço e, na cadeira, pede outro (ex.: marcou corte e pede barba). Se o app não permitir, o barbeiro faz por fora e comissão e financeiro ficam incompletos. Se permitir sem regra, nasce cobrança sem aceite.

## Decisão
- O **barbeiro** (ou o admin) **inclui o serviço no atendimento**.
- O serviço incluído tem o **preço vigente no momento da inclusão**. Os itens já reservados mantêm o valor da reserva ([0066](0066-valores-preservados-na-reserva.md)).
- A **cobertura** segue as regras do plano: a visita continua sendo **1 uso** (ex.: PREMIUM que marcou corte e inclui barba), ~~e o **combo equivalente** é aplicado quando a combinação bate ([0065](0065-combo-equivalente-automatico.md)).~~ → a inclusão paga o preço avulso; combo só por registro explícito ([0083](0083-inclusao-de-servico-pelo-preco-avulso.md)).
- A **parte avulsa** exige o **aceite do cliente**, registrado pelo barbeiro ([0063](0063-notificacao-nao-e-aceite.md)).
- Só é possível incluir se houver **tempo livre na agenda** do barbeiro logo depois do horário.

## Consequências
- O barbeiro precisa estar habilitado para o serviço incluído ([0037](0037-plano-vale-com-qualquer-barbeiro-e-habilitacao-por-servico.md)).
