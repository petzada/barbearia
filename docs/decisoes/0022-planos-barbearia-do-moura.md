# 0022 — Planos da Barbearia do Moura

- **Data:** 2026-10-13
- **Status:** aceita (teto em [0061](0061-teto-de-assinaturas-por-plano.md); versões em [0062](0062-versoes-de-plano.md))

## Decisão

| Plano | Serviços cobertos | Dias permitidos | Usos por ciclo mensal ([0025](0025-uso-do-plano-ciclo-e-consumo.md)) | Preço mensal |
|---|---|---|---|---|
| **BLACK** | Corte | Qualquer dia da semana | 4 | R$ 129,90 |
| **GOLD LIMITADO** | Corte e barba | Só terça e quarta | 4 | R$ 179,90 |
| **PREMIUM** | Corte e barba | Qualquer dia da semana | 4 | R$ 199,90 |

## Consequências
- Planos são **dados configuráveis pelo admin** no backoffice (nome, serviços cobertos, dias permitidos, quantidade de usos, preço), não código. Isso é exigência de [0019](0019-um-codigo-varios-deploys-barbearia-id.md): cada barbearia terá planos diferentes.
- Reajuste de preço: ver [0042](0042-reajuste-de-plano-para-todos-com-30-dias.md). Troca de plano: ver [0039](0039-troca-de-plano-no-proximo-ciclo.md).
- Ciclo e consumo de usos definidos em [0025](0025-uso-do-plano-ciclo-e-consumo.md). Horários futuros em [0026](0026-horarios-futuros-do-assinante.md). Cobertura e parte avulsa em [0027](0027-cobertura-do-plano-e-parte-avulsa.md).

## Revisão adversarial (2026-10-13)
- Nomes, preços e usos mantidos. Teto opcional por plano ([0061](0061-teto-de-assinaturas-por-plano.md)); versões preservam benefícios contratados ([0062](0062-versoes-de-plano.md)). Proposta de simulador de margem **rejeitada**: preço e comissão são decisões de negócio do admin, e a plataforma não avalia margem (Q12).
