# 0001 — Produto 100% web, mobile-first, com experiência de app nativo

- **Data:** 2026-10-13
- **Status:** aceita (parcialmente substituída por [0047](0047-app-mobile-e-backoffice-desktop.md): gestão do admin em backoffice desktop; onboarding detalhado em [0048](0048-onboarding-planos-sem-login-resto-com-login.md))

## Contexto
Definição do formato do produto para a Barbearia do Moura.

## Decisão
- Toda a interface é **web**, acessada pelo navegador.
- **Mobile-first**, com aparência e comportamento de **app nativo** (navegação por abas, telas cheias, instalável na tela inicial), para cliente e barbeiro. A gestão do admin é desktop ([0047](0047-app-mobile-e-backoffice-desktop.md)).
- **Sem landing page**: o usuário abre o link e cai direto no app (boas-vindas puláveis, [0048](0048-onboarding-planos-sem-login-resto-com-login.md); sem login: planos, benefícios, serviços e barbeiros, [0075](0075-conteudo-publico-servicos-e-barbeiros.md)).

## Consequências
- Não haverá app nas lojas (App Store/Play Store) neste momento.
- SEO e páginas de marketing não são requisitos; a escolha de stack pode priorizar experiência de app em vez de renderização para buscadores.
- Push no iPhone depende de instalar o app na tela inicial. Push é usado só pela equipe, que instala com tela guiada ([0044](0044-push-para-equipe-whatsapp-para-clientes.md)).

## Revisão adversarial (2026-10-13)
- Formato web/PWA mantido. Conteúdo público ampliado em [0075](0075-conteudo-publico-servicos-e-barbeiros.md); central de notificações por perfil em [0076](0076-central-de-notificacoes-e-gestao-no-desktop.md).
