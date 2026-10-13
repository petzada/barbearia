# 0081 — Valores padrão: limite geral, reserva de vaga e autenticação recente

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** lacunas deixadas pela revisão adversarial (Q16, Q48 e Q08 sem valor)
- **Detalha:** [0060](0060-limites-de-uso-e-de-reserva.md), [0061](0061-teto-de-assinaturas-por-plano.md), [0071](0071-autenticacao-recente-para-acoes-sensiveis.md)

## Decisão

| Parâmetro | Valor padrão | Configurável |
|---|---|---|
| **Limite geral de agendamentos futuros por cliente** (plano + avulso) | **4** | Sim, pelo admin |
| **Reserva temporária de vaga** ao iniciar o pagamento de plano com teto | **30 minutos** | Sim, por barbearia |
| **Janela de autenticação recente** para ações sensíveis do admin | **1 hora** | Sim, por barbearia |

## Consequências
- Com limite geral 4 e limite de plano 4, o assinante com 4 horários de plano marcados só marca outro quando um deles sair (ou com encaixe da equipe, com justificativa).
- Uma hora de janela cobre uma sessão de fechamento de comissões sem pedir código a cada ação.
