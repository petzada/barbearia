# 0067 — Fechamento: ajuste no primeiro período aberto e repasses parciais

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q33 e Q34
- **Substitui:** em [0041](0041-fechamento-mensal-de-comissoes.md), "ajuste no mês seguinte" e a marcação de pagamento como sim/não

## Decisão
- Ajuste que chega depois do fechamento entra no **primeiro período ainda aberto** (não necessariamente o mês seguinte), **referenciando o atendimento e o mês de origem**, sem alterar fechamentos anteriores.
- Cada **repasse** ao barbeiro é registrado com **valor e data**. O fechamento mostra **total devido, total pago e saldo pendente**.
- O fechamento só fica **quitado** quando os repasses cobrem o devido. Correções preservam o histórico.

## Consequências
- O status do fechamento passa a ser: aberto, fechado, parcialmente pago, quitado.
