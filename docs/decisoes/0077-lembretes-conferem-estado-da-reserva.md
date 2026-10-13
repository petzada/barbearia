# 0077 — Lembretes conferem o estado atual da reserva antes de enviar

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q32
- **Substitui:** em [0045](0045-lembretes-24h-e-3h-antes.md), o texto fixo "você ainda pode cancelar até HH:MM" no lembrete de 3 horas

## Contexto
Com o prazo de cancelamento configurável e guardado por reserva ([0058](0058-ciclo-de-vida-da-reserva-e-prazos.md)), uma mensagem atrasada ou um prazo maior que 3 horas poderia prometer um cancelamento sem perda que já não vale.

## Decisão
- Continuam os lembretes de **24 horas** e **3 horas** antes.
- **No momento do envio**, o app confere a reserva:
  - horário **cancelado ou já passado** → não envia;
  - **prazo sem perda ainda vigente** → informa o **prazo real** da reserva;
  - **prazo vencido** → envia **só o lembrete do atendimento**, sem falar em liberação de horário ou devolução de uso.
- Continua valendo o **aviso explícito no ato do cancelamento tardio** ([0058](0058-ciclo-de-vida-da-reserva-e-prazos.md)).
