# 0045 — Lembretes ao cliente: confirmação, 24h antes e 3h antes

- **Data:** 2026-10-13
- **Status:** aceita (conteúdo do lembrete substituído pela [0077](0077-lembretes-conferem-estado-da-reserva.md))

## Contexto
O lembrete só é útil se chegar antes do limite de cancelamento de 2 horas ([0011](0011-cancelamento-ate-2h-antes.md)). Depois disso, para o assinante, desistir já consome uso ([0025](0025-uso-do-plano-ciclo-e-consumo.md)).

## Decisão
- **Confirmação** no WhatsApp ao marcar.
- **Lembrete 24 horas antes.**
- **Lembrete 3 horas antes**, ~~dizendo "você ainda pode cancelar até HH:MM"~~ → com o **prazo real** da reserva quando ainda vigente ([0077](0077-lembretes-conferem-estado-da-reserva.md)), e link para cancelar ou remarcar.

## Consequências
- Se o horário for marcado com menos de 24h, o lembrete de 24h não é enviado. Se for marcado com menos de 3h (cliente marcando entre 2h e 3h antes, [0035](0035-antecedencia-minima-2h.md), ou encaixe, [0034](0034-agendamento-feito-pela-barbearia.md)), vai só a confirmação.
- Os lembretes são jobs agendados no pg-boss ([0016](0016-fila-de-jobs-pg-boss.md)), cancelados automaticamente se o horário for cancelado ou alterado.
- O cliente pode desligar os lembretes ([0046](0046-lgpd-aceite-opt-out-e-exclusao.md)). A confirmação e os avisos de cancelamento pela barbearia continuam.

## Revisão adversarial (2026-10-13)
- Horários de envio mantidos; conteúdo e envio conferem o estado da reserva ([0077](0077-lembretes-conferem-estado-da-reserva.md)).
