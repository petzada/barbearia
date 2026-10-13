# 0051 — Cliente pré-cadastrado só recebe mensagens do horário que pediu

- **Data:** 2026-10-13
- **Status:** aceita (SAIR redefinido pela [0073](0073-sair-desliga-so-lembretes.md))
- **Substitui:** "o cliente pré-cadastrado recebe os lembretes no WhatsApp normalmente" de [0034](0034-agendamento-feito-pela-barbearia.md)
- **Detalha:** [0010](0010-whatsapp-via-whatsmiau.md), [0046](0046-lgpd-aceite-opt-out-e-exclusao.md)

## Contexto
O cliente pré-cadastrado pelo barbeiro ou admin (só nome e telefone) ainda não aceitou Termos e Política. Mensagem automática para quem nunca abriu o app é o que mais gera denúncia de spam e ban do número. Mas ele pediu aquele horário, então confirmação e lembrete daquele horário são justificados.

## Decisão
- O pré-cadastrado recebe **só a confirmação e os lembretes do horário que ele pediu**.
- Cada mensagem traz um link **"ative sua conta"** e a opção de responder **SAIR** para desligar os lembretes ([0073](0073-sair-desliga-so-lembretes.md)).
- **Nada além disso** (avisos de planos, novidades etc.) até ele **ativar a conta e aceitar os termos**.
- Ao criar o horário, o barbeiro ou admin **confirma que o cliente pediu aquele horário** (registrado).

## Consequências
- ~~Responder SAIR desliga as mensagens daquele telefone.~~ → SAIR desliga só os lembretes opcionais ([0073](0073-sair-desliga-so-lembretes.md)). O app trata a resposta recebida pelo webhook do WhatsMiau.

## Revisão adversarial (2026-10-13)
- Comunicação limitada ao horário pedido mantida. SAIR redefinido ([0073](0073-sair-desliga-so-lembretes.md)); identidade pelo identificador interno ([0070](0070-identificador-interno-e-troca-de-whatsapp.md)).
