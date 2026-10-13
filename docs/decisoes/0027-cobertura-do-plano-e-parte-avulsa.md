# 0027 — Cobertura do plano: 1 visita = 1 uso; o que não é coberto vira avulso, mostrado antes de confirmar

- **Data:** 2026-10-13
- **Status:** aceita (detalhada por [0063](0063-notificacao-nao-e-aceite.md), [0065](0065-combo-equivalente-automatico.md) e [0066](0066-valores-preservados-na-reserva.md))
- **Detalha:** [0022](0022-planos-barbearia-do-moura.md), [0025](0025-uso-do-plano-ciclo-e-consumo.md)

## Contexto
Casos de balcão: GOLD querendo cortar fora de terça e quarta, BLACK querendo barba, serviço fora do plano na mesma visita, PREMIUM fazendo só o corte. Bloquear empurra o cliente para o WhatsApp do dono; liberar sem avisar gera briga no balcão.

## Decisão
- **Uma visita com serviços cobertos pelo plano = 1 uso**, seja corte, barba ou os dois (dentro do que o plano cobre).
- **Fora do dia permitido** ou **serviço não coberto**: o cliente **pode marcar**, mas o app mostra **antes de confirmar** que aquela parte é **avulsa, com o valor, paga na barbearia**, e que ela **não consome uso**.
- A parte avulsa é paga **na barbearia**, e o barbeiro ou admin registra o pagamento no app ([0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md)).
- **Comissão:** % assinante sobre a parte coberta e % avulso sobre o resto ([0023](0023-comissao-por-barbeiro-e-servico.md)).

## Consequências
- Um agendamento pode ter itens cobertos e itens avulsos. Cada item guarda serviço, valor cheio, se é coberto ou avulso e o percentual aplicado.
- Exemplos: GOLD numa sexta → visita inteira avulsa, sem consumir uso. BLACK com corte + barba → corte coberto (1 uso), barba avulsa.
- Combo com só parte coberta: dividido em componentes ([0049](0049-combo-dividido-em-componentes.md)).

## Revisão adversarial (2026-10-13)
- Mantida. Aceite explícito quando a cobertura muda ([0063](0063-notificacao-nao-e-aceite.md)); combo equivalente automático ([0065](0065-combo-equivalente-automatico.md)); preço preservado na reserva ([0066](0066-valores-preservados-na-reserva.md)); pagamento avulso pendente, parcial ou quitado ([0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md)).
