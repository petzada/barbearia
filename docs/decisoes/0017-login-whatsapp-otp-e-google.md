# 0017 — Login: código pelo WhatsApp, Google como reserva, telefone como identidade

- **Data:** 2026-10-13
- **Status:** aceita (identidade substituída pela [0070](0070-identificador-interno-e-troca-de-whatsapp.md); ações sensíveis em [0071](0071-autenticacao-recente-para-acoes-sensiveis.md))
- **Detalha:** [0015](0015-tanstack-start-better-auth-drizzle.md)

## Contexto
O login principal depende de um número de WhatsApp em API não oficial. Se o número for banido, ninguém recebe código. O dono do produto escolheu o Google como único plano B (descartou código por e-mail e SMS pago).

## Decisão
- ~~Telefone é a identidade única da conta.~~ → a conta tem identificador interno permanente; o WhatsApp é obrigatório e verificado ([0070](0070-identificador-interno-e-troca-de-whatsapp.md)).
- **Login principal:** código de **6 dígitos** enviado pelo WhatsApp (WhatsMiau), com **validade de 5 minutos**, **no máximo 5 tentativas** por código e **limite de envios por telefone e por IP**.
- **Login secundário:** Google. Quem entra pelo Google **confirma o telefone por código no primeiro acesso**, e as duas formas de entrar ficam **na mesma conta**.
- **Não** haverá incentivo no onboarding para vincular o Google.
- **Sessão de 90 dias**, renovada a cada uso.
- **Número dedicado só para os códigos de login**, separado do número de notificações, **depois do MVP validado**. No piloto, códigos e lembretes saem do mesmo número ([0031](0031-whatsmiau-planos-e-numeros-por-fase.md)).

## Consequências e riscos aceitos
- Se o número de códigos cair, só entra quem **já vinculou o Google**. Um cliente novo, mesmo entrando pelo Google, precisa confirmar o telefone por código e fica bloqueado até o número voltar. A sessão de 90 dias reduz o impacto para quem já está logado.
- Não há número reserva só para códigos. Para recuperar o serviço, é preciso parear um número novo no WhatsMiau e trocar a configuração.

## Revisão adversarial (2026-10-13)
- Login esclarecido e identidade revista em [0070](0070-identificador-interno-e-troca-de-whatsapp.md): Google entra sem código depois da primeira vinculação; só WhatsApp pede código a cada novo login. Incentivo ao Google continua não aprovado. Ações sensíveis em [0071](0071-autenticacao-recente-para-acoes-sensiveis.md).
