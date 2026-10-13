# 0011 — Cancelamento de horário pelo cliente até 2 horas antes

- **Data:** 2026-10-13
- **Status:** substituída por [0058](0058-ciclo-de-vida-da-reserva-e-prazos.md): cancelamento tardio permitido com perda do uso; prazo configurável e guardado por reserva

## Decisão
- ~~O cliente pode cancelar o horário até 2 horas antes.~~ → o cliente cancela a qualquer momento antes do horário: dentro do prazo, o uso volta; depois, o uso comprometido não volta. O prazo é configurável (padrão 2 horas) e guardado por reserva ([0058](0058-ciclo-de-vida-da-reserva-e-prazos.md)).
- ~~Proposta provisória para a falta: não conta como corte realizado no plano.~~ → substituída: a falta do assinante **consome uso** e sinaliza o admin ([0025](0025-uso-do-plano-ciclo-e-consumo.md)); a falta do avulso não tem custo ([0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md)).

## Consequências
- Para o horário sempre nascer cancelável, o cliente só marca com pelo menos 2 horas de antecedência ([0035](0035-antecedencia-minima-2h.md)).

## Revisão adversarial (2026-10-13)
- Substituída pela [0058](0058-ciclo-de-vida-da-reserva-e-prazos.md): o cancelamento tardio existe e consome o uso comprometido; o prazo é configurável e guardado por reserva.
