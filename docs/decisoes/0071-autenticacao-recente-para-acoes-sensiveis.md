# 0071 — Autenticação recente para ações sensíveis; saída da equipe revoga acesso na hora

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q08
- **Detalha:** [0015](0015-tanstack-start-better-auth-drizzle.md), [0017](0017-login-whatsapp-otp-e-google.md)

## Contexto
Uma sessão de 90 dias num aparelho que outra pessoa pode pegar permitiria ações sensíveis sem provar identidade de novo.

## Decisão
- A **sessão longa** continua no uso do dia a dia.
- **Ações administrativas sensíveis** exigem **autenticação recente** (ex.: alterar permissões, alterar dados de integração, marcar repasses como pagos).
- Consultar a agenda e confirmar atendimentos **não** exigem nova autenticação.
- Quando alguém **sai da equipe**, as **permissões e sessões de trabalho** dessa pessoa são **revogadas imediatamente**.

## Consequências
- Janela de "autenticação recente": **1 hora** ([0081](0081-valores-padrao-de-limites-e-seguranca.md)).
