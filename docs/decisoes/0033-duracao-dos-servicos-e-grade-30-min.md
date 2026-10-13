# 0033 — Duração por serviço, igual para todos os barbeiros, grade de 30 minutos

- **Data:** 2026-10-13
- **Status:** aceita (detalhada por [0065](0065-combo-equivalente-automatico.md) e [0069](0069-jornada-e-duracao-nao-alteram-reservas.md))

## Decisão
- O admin define a **duração de cada serviço**, inclusive dos combos (ex.: "corte + barba" tem duração própria, não necessariamente a soma).
- A duração é **igual para todos os barbeiros** (sem ajuste por barbeiro).
- Os horários oferecidos ao cliente começam em **múltiplos de 30 minutos**.
- Uma visita com vários itens ocupa a soma das durações, arredondada para cima até fechar a grade de 30 minutos.

## Consequências
- Serviços de 15 ou 45 minutos deixam algum tempo ocioso. É o preço da simplicidade, aceito.
- Duração e grade ficam na configuração da barbearia ([0019](0019-um-codigo-varios-deploys-barbearia-id.md)), para outras barbearias poderem usar outra grade.
- Encaixe fora da grade só por barbeiro ou admin ([0034](0034-agendamento-feito-pela-barbearia.md)).
- Combos têm componentes cadastrados, usados quando só parte é coberta pelo plano ([0049](0049-combo-dividido-em-componentes.md)).

## Revisão adversarial (2026-10-13)
- Grade e duração por serviço mantidas. Combo equivalente automático ([0065](0065-combo-equivalente-automatico.md)); nova duração só para novas reservas ([0069](0069-jornada-e-duracao-nao-alteram-reservas.md)).
