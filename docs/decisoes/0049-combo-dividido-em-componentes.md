# 0049 — Combo é dividido em componentes quando só parte é coberta pelo plano

- **Data:** 2026-10-13
- **Status:** aceita (detalhada por [0065](0065-combo-equivalente-automatico.md) e [0066](0066-valores-preservados-na-reserva.md))
- **Detalha:** [0023](0023-comissao-por-barbeiro-e-servico.md), [0027](0027-cobertura-do-plano-e-parte-avulsa.md), [0033](0033-duracao-dos-servicos-e-grade-30-min.md)

## Contexto
O combo (ex.: "corte + barba") tem duração e valor cheio próprios, normalmente menor que a soma das partes. Para um assinante BLACK (só corte coberto), o app não saberia quanto vale a "parte barba" do combo, nem para cobrar no balcão nem para calcular a comissão.

## Decisão
- O admin cadastra o combo **com seus componentes** (ex.: corte + barba).
- **Combo inteiro coberto** (GOLD/PREMIUM no dia permitido) ou **nada coberto** (avulso): vale o combo, com **valor cheio e duração próprios**.
- **Só parte coberta** (ex.: BLACK): o componente coberto consome o uso, e o componente não coberto é cobrado pelo **preço avulso do próprio componente** (ex.: a barba avulsa). A comissão segue cada parte: % assinante sobre o componente coberto e % avulso sobre o não coberto, cada um pelo valor cheio do componente.
- A **duração** continua sendo a do combo.

## Consequências
- O item do agendamento guarda o combo e, quando dividido, cada componente com valor, tipo (coberto/avulso) e percentual.

## Revisão adversarial (2026-10-13)
- Regra mantida. Combo equivalente automático ([0065](0065-combo-equivalente-automatico.md)); valores preservados na reserva ([0066](0066-valores-preservados-na-reserva.md)).
