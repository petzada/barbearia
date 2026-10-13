# 0041 — Fechamento mensal de comissões, com período travado

- **Data:** 2026-10-13
- **Status:** parcialmente substituída por [0067](0067-fechamento-ajuste-no-periodo-aberto-e-repasse-parcial.md): ajuste no primeiro período aberto e repasses parciais
- **Detalha:** [0009](0009-repasse-manual-aos-barbeiros.md)

## Decisão
- O período de comissões é o **mês civil**.
- O admin **fecha o mês**: o período **trava**, e o admin registra os repasses de cada barbeiro, inclusive parciais ([0067](0067-fechamento-ajuste-no-periodo-aberto-e-repasse-parcial.md)).
- Qualquer coisa que chegue depois do fechamento (atendimento confirmado com atraso, correção) entra como ~~ajuste no mês seguinte~~ → **ajuste no primeiro período ainda aberto** ([0067](0067-fechamento-ajuste-no-periodo-aberto-e-repasse-parcial.md)), nunca alterando o mês fechado.

## Consequências
- O barbeiro vê o extrato por mês: lançamentos, ajustes, total e status (aberto, fechado, parcialmente pago, quitado).
- Antes de fechar, o app alerta se existem atendimentos do mês ainda sem confirmação.

## Revisão adversarial (2026-10-13)
- Fechamento travado mantido. Ajuste no primeiro período aberto e repasses parciais ([0067](0067-fechamento-ajuste-no-periodo-aberto-e-repasse-parcial.md)).
