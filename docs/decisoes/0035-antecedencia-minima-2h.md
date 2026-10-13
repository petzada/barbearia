# 0035 — Antecedência mínima de 2 horas para o cliente marcar pelo app

- **Data:** 2026-10-13
- **Status:** parcialmente substituída por [0058](0058-ciclo-de-vida-da-reserva-e-prazos.md): antecedência e prazo de cancelamento são configurações independentes; 2 horas continua como padrão

## Contexto
Com a regra de cancelamento até 2 horas antes ([0011](0011-cancelamento-ate-2h-antes.md)), um horário marcado com menos de 2 horas já nasceria sem poder ser cancelado. Para o assinante, isso significaria uso consumido se ele desistisse ([0025](0025-uso-do-plano-ciclo-e-consumo.md)).

## Decisão
- O cliente só marca pelo app horários com **pelo menos 2 horas de antecedência**.
- Configurável no backoffice.
- Quem quer horário em cima da hora pede encaixe ao barbeiro ou ao admin ([0034](0034-agendamento-feito-pela-barbearia.md)).

## Consequências
- Todo horário marcado pelo cliente nasce cancelável sem perda de uso enquanto a antecedência mínima for maior ou igual ao prazo de cancelamento. Se o admin configurar diferente, o app avisa antes de confirmar ([0058](0058-ciclo-de-vida-da-reserva-e-prazos.md)).

## Revisão adversarial (2026-10-13)
- Antecedência mínima desacoplada do prazo de cancelamento e prazo guardado por reserva ([0058](0058-ciclo-de-vida-da-reserva-e-prazos.md)). O padrão de 2 horas continua.
