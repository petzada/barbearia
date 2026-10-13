# 0010 — Notificações por WhatsApp via WhatsMiau desde o MVP

- **Data:** 2026-10-13 (atualizada no mesmo dia: dois números dedicados)
- **Status:** aceita

## Decisão
- Notificações por WhatsApp desde o MVP, com o provedor **WhatsMiau** (API não oficial do WhatsApp).
- **Risco aceito** pelo dono do produto: o número pode ser banido pela Meta.
- O WhatsMiau é **serviço gerenciado** (WhatsMiau Cloud): API key, instância pareada por QR Code, envio via `POST /v2/message/sendText/:instance` e webhooks. Não é self-hosted ([docs](https://whatsmiau.dev/docs/getting-started)).
- **Dois números dedicados** no WhatsMiau **depois do MVP validado** (no piloto, um número só, ver [0031](0031-whatsmiau-planos-e-numeros-por-fase.md)), ambos com nome e foto da Barbearia do Moura no perfil:
  1. **Número de códigos:** envia só os códigos de login ([0017](0017-login-whatsapp-otp-e-google.md)).
  2. **Número de notificações:** envia lembretes e avisos de agendamento e de assinatura.
- O **WhatsApp oficial do dono fica fora da automação**. Ele foi considerado para os lembretes e descartado: um ban colocaria em risco o principal canal de venda da barbearia. Na fase de desenvolvimento, um número de teste do dono do produto faz esse papel.

## Consequências
- Enviar só para clientes que aceitaram os termos ([0046](0046-lgpd-aceite-opt-out-e-exclusao.md)), com volume baixo e sem disparo em massa. Exceção: cliente pré-cadastrado recebe só as mensagens do horário que pediu ([0051](0051-mensagens-para-cliente-pre-cadastrado.md)).
- O envio passa por uma interface própria (`NotificationProvider`), para dar para trocar de provedor (API oficial da Meta, outro não oficial, SMS) sem mexer no resto do sistema.
- O login via WhatsApp é tratado em [0017](0017-login-whatsapp-otp-e-google.md).
- WhatsApp é só para clientes. Barbeiro e admin recebem avisos por Web Push ([0044](0044-push-para-equipe-whatsapp-para-clientes.md)). Momentos dos lembretes em [0045](0045-lembretes-24h-e-3h-antes.md).

## Revisão adversarial (2026-10-13)
- Provedor e risco aceito mantidos. SAIR desliga só lembretes ([0073](0073-sair-desliga-so-lembretes.md)); lembretes conferem o estado da reserva ([0077](0077-lembretes-conferem-estado-da-reserva.md)).
