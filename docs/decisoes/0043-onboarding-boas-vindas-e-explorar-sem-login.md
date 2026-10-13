# 0043 — Onboarding: boas-vindas puláveis, explorar sem login, conta ao confirmar

- **Data:** 2026-10-13
- **Status:** substituída por [0048](0048-onboarding-planos-sem-login-resto-com-login.md): sem login, só planos e benefícios; agendar exige login
- **Detalha:** [0001](0001-produto-web-mobile-first-estilo-app.md), [0017](0017-login-whatsapp-otp-e-google.md)

## Contexto
A pesquisa (`docs/pesquisas/23-decisao-uma-loja.md`) mostra concorrentes que deixam marcar sem conta para reduzir desistência. A conta continua obrigatória (telefone é a identidade), mas é pedida só quando o cliente já decidiu.

## Decisão
1. **Boas-vindas:** 2 ou 3 telas (marca, planos, como funciona), com **"Pular"** sempre visível.
2. **Explorar sem login:** serviços, horários, barbeiros e planos ficam visíveis sem conta.
3. **Conta ao confirmar:** ao confirmar um horário ou assinar um plano, o cliente informa telefone → código no WhatsApp → nome → pronto (ou entra com Google, confirmando o telefone).

## Regras de exibição das boas-vindas (boa prática)
- Aparecem **uma vez por dispositivo**. Concluir ou pular grava a marcação no navegador, e as telas não voltam.
- **Nunca** aparecem para quem já está logado.
- **Não** aparecem quando o cliente chega por link direto (ex.: link de remarcar do lembrete): ele vai direto para a tela do link.
- Ficam acessíveis depois em Perfil → "Como funciona", para quem quiser rever.
- Se o conteúdo mudar bastante (ex.: plano novo), a versão das boas-vindas sobe e elas aparecem de novo uma vez.

## Revisão adversarial (2026-10-13)
- Já substituída pela 0048. A [0075](0075-conteudo-publico-servicos-e-barbeiros.md) reabre só serviços e barbeiros, não os horários. Revisada; sem alteração.
