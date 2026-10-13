# 0054 — Pagamento revertido ou contestado

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q50
- **Detalha:** [0018](0018-inadimplencia-suspende-e-reativa.md), [0025](0025-uso-do-plano-ciclo-e-consumo.md), [0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md)

## Decisão
- Quando o provedor **confirmar a reversão** de um pagamento (estorno, chargeback), o app **reavalia a cobertura**. Se nenhum outro pagamento válido sustenta o ciclo, os **benefícios restantes são suspensos** e o **admin é sinalizado**.
- **Horários futuros** seguem a [0053](0053-inadimplencia-revisada-reservas-mantidas.md): regularizar, avulso com aceite ou cancelar sem penalidade.
- **Atendimentos já realizados** mantêm o histórico, **sem cobrança avulsa retroativa** e **sem retirada automática de comissão**. Ajustes dependem de análise do admin, com motivo e histórico ([0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md)).
- **Contestação ainda em análise** gera pendência para o admin, mas não equivale a reversão definitiva.

## Consequências
- **A verificar nos provedores:** quais eventos de reversão e contestação o Mercado Pago e a Woovi notificam por webhook.
