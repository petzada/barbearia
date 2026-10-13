# 0080 — Renovação em dia inexistente vai para o último dia do mês

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** lacuna deixada pela revisão adversarial (calendário)
- **Detalha:** [0025](0025-uso-do-plano-ciclo-e-consumo.md), [0052](0052-quitacao-unica-e-regularizacao-tardia.md)

## Contexto
Com a 0052, um ciclo pode começar em qualquer dia, inclusive 29, 30 ou 31. O ciclo é **mensal**, e não "30 dias".

## Decisão
- A renovação acontece **no mesmo dia do mês**. Se esse dia **não existir**, ela acontece no **último dia daquele mês**. Ex.: 31/01 → 28/02 → 31/03 (o dia original volta quando existe).
- Prazos, ciclos e lembretes usam o **fuso horário da barbearia** (America/Sao_Paulo para a Barbearia do Moura), definido na configuração ([0019](0019-um-codigo-varios-deploys-barbearia-id.md)).

## Consequências
- O crédito de reposição continua com **30 dias corridos** ([0059](0059-credito-de-reposicao.md)). É a única contagem em dias.
- **A verificar nos provedores:** se o Mercado Pago e a Woovi aceitam qualquer dia de cobrança ou limitam a faixa de dias.
