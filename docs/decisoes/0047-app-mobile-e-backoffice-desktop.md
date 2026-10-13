# 0047 — App mobile para cliente e barbeiro; backoffice desktop para gestão; resumo de gestão no mobile

- **Data:** 2026-10-13
- **Status:** aceita (reafirmada e detalhada pela [0076](0076-central-de-notificacoes-e-gestao-no-desktop.md))
- **Substitui:** "mobile-first" para **toda** a interface, de [0001](0001-produto-web-mobile-first-estilo-app.md): a gestão do admin passa a ser pensada para desktop

## Contexto
O admin que também é barbeiro ([0002](0002-tres-perfis-de-usuario.md)) não pode ter dois apps nem duas contas. A matriz barbeiro × serviço, o CRM e o fechamento de comissões são tabelas que funcionam mal no celular.

## Decisão
- **Uma conta, um sistema** (o mesmo monolito e o mesmo login), com duas superfícies:
  1. **App mobile** (PWA, estilo app nativo) para **cliente** e **barbeiro**, com abas inferiores por perfil:
     - cliente: Início, Agendar, Plano, Perfil;
     - barbeiro: Agenda, Atendimentos, Ganhos, Perfil.
  2. **Backoffice desktop** para a **gestão do admin**: CRM e assinaturas, matriz barbeiro × serviço, planos, jornadas, financeiro, fechamento de comissões, configurações. É uma área separada, com layout de computador.
- **Resumo de gestão no mobile (boa prática):** o admin ganha no app uma **aba "Gestão"** (só para admins), em vez de um botão escondido no Perfil, porque é uso diário. Ela traz:
  - os quatro blocos da [0038](0038-painel-inicial-do-admin.md) em **cartões só de leitura** (assinaturas, receita do mês, comissões a pagar, agenda e pendências);
  - alertas que pedem ação (atendimentos sem confirmação, assinaturas suspensas);
  - o link "Abrir gestão completa" (backoffice no navegador do computador).
- O admin-barbeiro vê no app as abas de barbeiro **e** a aba Gestão.

## Consequências
- A tela inicial completa da 0038 fica no backoffice desktop; o mobile mostra a versão em cartões.
- Ações de gestão que o admin precisa fazer na rua (ex.: cancelar um horário, marcar um encaixe) continuam possíveis pelo app mobile, pela agenda.

## Revisão adversarial (2026-10-13)
- Gestão sensível no desktop reafirmada; proposta de levar correções ao mobile **rejeitada** (Q30). Central de notificações em [0076](0076-central-de-notificacoes-e-gestao-no-desktop.md); ações de agenda no mobile mantidas.
