# 0048 — Onboarding: sem login, só planos e benefícios; agendar e o resto do app exigem login

- **Data:** 2026-10-13
- **Status:** parcialmente substituída por [0075](0075-conteudo-publico-servicos-e-barbeiros.md): sem login também aparecem serviços e barbeiros
- **Substitui:** [0043](0043-onboarding-boas-vindas-e-explorar-sem-login.md) (que deixava explorar serviços, horários e barbeiros sem login)
- **Detalha:** [0001](0001-produto-web-mobile-first-estilo-app.md), [0017](0017-login-whatsapp-otp-e-google.md)

## Decisão
1. **Boas-vindas:** 2 ou 3 telas que apresentam a barbearia, os **planos e benefícios** e **oferecem o login**. Botão **"Pular"** sempre visível.
2. ~~Sem login, o cliente só explora as telas de planos e benefícios.~~ → sem login: **planos, benefícios, serviços e barbeiros**; horários não ([0075](0075-conteudo-publico-servicos-e-barbeiros.md)).
3. **Com login**, o cliente tem acesso a **agendar** e a **todo o resto do app** (assinar, meus horários, perfil). Qualquer ação fora das telas públicas ([0075](0075-conteudo-publico-servicos-e-barbeiros.md)) leva ao login: telefone → código no WhatsApp → nome → pronto (ou Google, confirmando o telefone).

## Regras de exibição das boas-vindas (mantidas da 0043)
- Aparecem **uma vez por dispositivo**. Concluir ou pular grava a marcação no navegador, e as telas não voltam.
- **Nunca** aparecem para quem já está logado.
- **Não** aparecem quando o cliente chega por link direto (ex.: link de remarcar do lembrete). Se o link exige login, ele vai para o login e depois para a tela do link.
- Ficam acessíveis depois em Perfil → "Como funciona".
- Se o conteúdo mudar bastante (ex.: plano novo), a versão das boas-vindas sobe e elas aparecem de novo uma vez.

## Consequências
- Horários só aparecem depois do login; serviços e barbeiros são públicos ([0075](0075-conteudo-publico-servicos-e-barbeiros.md)). O fluxo de marcação da [0036](0036-fluxo-de-marcacao-horario-primeiro.md) é sempre de um cliente logado.
- Sem login, a navegação mostra as telas públicas da [0075](0075-conteudo-publico-servicos-e-barbeiros.md) e "Entrar". As abas da [0047](0047-app-mobile-e-backoffice-desktop.md) aparecem depois do login.

## Revisão adversarial (2026-10-13)
- Ajustada: sem login também aparecem serviços e barbeiros; horários e contratação exigem login ([0075](0075-conteudo-publico-servicos-e-barbeiros.md)).
