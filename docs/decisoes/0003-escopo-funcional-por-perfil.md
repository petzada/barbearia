# 0003 — Escopo funcional inicial por perfil

- **Data:** 2026-10-13
- **Status:** aceita (parcialmente substituída por [0009](0009-repasse-manual-aos-barbeiros.md), [0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md) e [0032](0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md))

## Decisão

**Cliente**
- Onboarding e criação de conta
- Agendamento de horário com os barbeiros
- Contratação e gestão de assinatura recorrente, com benefícios conforme o plano
- Pagamentos dentro do app, **só da assinatura**. Avulso é pago na barbearia ([0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md))

**Barbeiro**
- ~~Gestão da própria agenda e horários de trabalho~~ → a jornada é definida pelo admin ([0032](0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md)); o barbeiro vê a agenda e marca encaixes ([0034](0034-agendamento-feito-pela-barbearia.md))
- Bloqueios pontuais de horário na agenda, só em horário livre ([0032](0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md))
- Visualização dos valores a receber no mês ([0041](0041-fechamento-mensal-de-comissoes.md))
- Confirmação dos atendimentos: realizado ou falta, e forma de pagamento do avulso ([0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md))

**Administrador**
- Tudo do barbeiro
- Painel administrativo: finanças da barbearia e dos barbeiros contratados, em backoffice desktop com resumo no app ([0038](0038-painel-inicial-do-admin.md), [0047](0047-app-mobile-e-backoffice-desktop.md))
- ~~Liberar pagamentos aos barbeiros, ou pelo menos visualizá-los~~ → definido em [0009](0009-repasse-manual-aos-barbeiros.md): o sistema calcula, o admin paga por fora e marca como pago
- Gestão das assinaturas dos clientes
- Gestão geral da barbearia (barbeiros, serviços, planos, etc.)

## Consequências
- ~~"Liberar pagamentos" ainda precisa de definição~~ → resolvido em [0009](0009-repasse-manual-aos-barbeiros.md).

## Revisão adversarial (2026-10-13)
- Escopo mantido. Cliente e equipe ganham central de notificações ([0076](0076-central-de-notificacoes-e-gestao-no-desktop.md)); atendimento e pagamento passam a ser estados separados ([0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md)); correções de atendimento só pelo admin, no desktop ([0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md), [0076](0076-central-de-notificacoes-e-gestao-no-desktop.md)).
