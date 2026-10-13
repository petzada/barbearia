# 0058 — Ciclo de vida da reserva, cancelamento tardio e prazos configuráveis

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q03, Q25, Q26 e Q27
- **Substitui:** [0011](0011-cancelamento-ate-2h-antes.md) (cancelar só até 2 horas antes) e, em [0035](0035-antecedencia-minima-2h.md), o vínculo fixo entre antecedência mínima e prazo de cancelamento
- **Detalha:** [0025](0025-uso-do-plano-ciclo-e-consumo.md), [0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md)

## Contexto
A 0025 ligava o consumo do uso ao prazo de cancelamento, e a 0029 à confirmação do atendimento: dois eventos que podiam descontar o mesmo uso. Além disso, bloquear o cancelamento depois do prazo impedia liberar um horário que a equipe poderia reaproveitar.

## Decisão

### Etapas do uso de plano
1. **Reservado:** ao agendar, um uso fica reservado e indisponível para outra reserva.
2. **Comprometido:** ao atingir o prazo de cancelamento, **esse mesmo uso** fica comprometido.
3. **Desfecho:** marcar **realizado** ou **falta** registra o desfecho, **sem novo desconto**.
- Só atendimento **realizado** gera comissão.
- Cancelamento pela barbearia devolve o benefício como crédito de reposição ([0059](0059-credito-de-reposicao.md)).

### Cancelamento pelo cliente
- **Dentro do prazo:** o uso volta.
- **Depois do prazo (cancelamento tardio):** o app **deixa cancelar**, com **aviso explícito** de que o uso comprometido não volta. O horário é **liberado na hora** e a **equipe é notificada**.
- **Avulso:** sem custo por cancelamento tardio ou falta.
- O histórico **distingue cancelamento tardio de falta sem aviso**.
- Continuam sem penalidade os casos de mudança de cobertura ([0063](0063-notificacao-nao-e-aceite.md)) e de ação da barbearia.

### Prazos
- O admin configura **separadamente** a **antecedência mínima para agendar** e o **prazo de cancelamento sem perda de uso**. Os valores da Barbearia do Moura continuam **2 horas e 2 horas** até o admin mudar.
- Se a configuração permitir marcar dentro do prazo de perda, o app **avisa antes de confirmar** que o uso fica comprometido na hora.
- **Cada agendamento guarda o prazo vigente na confirmação.** Mudanças do admin valem só para novas reservas.

## Consequências
- Os lembretes usam o prazo da própria reserva ([0077](0077-lembretes-conferem-estado-da-reserva.md)).
- O aviso de cancelamento tardio também vai para a central de notificações da equipe ([0076](0076-central-de-notificacoes-e-gestao-no-desktop.md)).
