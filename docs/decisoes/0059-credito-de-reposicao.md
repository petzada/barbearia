# 0059 — Crédito de reposição quando a barbearia cancela

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q22, Q39 e Q40
- **Substitui:** em [0032](0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md), "o uso do plano volta" quando a barbearia cancela

## Contexto
Devolver o uso no último dia do ciclo (que expira, [0025](0025-uso-do-plano-ciclo-e-consumo.md)) tornaria a reposição impossível de aproveitar. E devolver crédito de uma reserva ainda não paga criaria benefício gratuito.

## Decisão
- Quando a barbearia cancela um horário ligado a **benefício já pago**, o cliente recebe um **crédito de reposição válido por 30 dias** a partir do cancelamento, com as **mesmas condições do plano original** (serviços e dias permitidos).
- O crédito **não exige renovar a assinatura**, **não muda a próxima cobrança** e, quando usado, gera **comissão de atendimento coberto** (% assinante).
- Se a reserva dependia de uma **renovação ainda não paga**, o app libera a reserva e a previsão de uso, **sem crédito**.
- **Reserva feita com crédito:**
  - cliente cancela dentro do prazo → recupera o **mesmo crédito**, com a **validade original**;
  - cancelamento tardio ou falta → o crédito é **consumido**;
  - a barbearia cancela de novo → devolve o **mesmo crédito**, com **30 dias reiniciados**.
- **Sem duplicação** de crédito.

## Consequências
- O crédito é uma **exceção expressa** à regra de assinatura ativa para atendimento coberto. Não é mensalidade nova.
- Transferência de barbeiro recusada pelo cliente também gera crédito quando houver benefício pago ([0063](0063-notificacao-nao-e-aceite.md)).
- Crédito válido adia a conclusão da exclusão de conta ([0072](0072-exclusao-de-conta-no-fim-do-periodo.md)).
