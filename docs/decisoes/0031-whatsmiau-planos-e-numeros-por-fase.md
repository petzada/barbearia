# 0031 — WhatsMiau: um número no piloto, dois números depois da validação

- **Data:** 2026-10-13
- **Status:** aceita
- **Substitui:** o momento de entrada dos dois números dedicados de [0010](0010-whatsapp-via-whatsmiau.md) e [0017](0017-login-whatsapp-otp-e-google.md)

## Decisão

| Fase | Plano WhatsMiau | Números |
|---|---|---|
| Desenvolvimento **e piloto com clientes reais** | **Starter**: R$ 30/mês, 1 instância | **1 número** (de teste do dono do produto) para códigos de login, lembretes e avisos |
| **Depois do MVP validado** | **Pro**: R$ 90/mês, 5 instâncias | **2 números dedicados**: um só para códigos de login, outro para lembretes e avisos |

## Riscos aceitos
- Durante o piloto, **se o único número for banido, caem ao mesmo tempo o login por código e os lembretes**. Quem já vinculou o Google ainda entra, e quem tem sessão ativa (90 dias) continua logado.
- O código já nasce preparado para dois números (configuração separada para "códigos" e "notificações", que no piloto apontam para a mesma instância). A troca é só de configuração.

## Revisão adversarial (2026-10-13)
- Estratégia mantida. Limitação explícita: sem Google vinculado nem sessão válida, o acesso depende do código no WhatsApp ([0070](0070-identificador-interno-e-troca-de-whatsapp.md)).
