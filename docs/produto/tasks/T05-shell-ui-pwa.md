# T05 — Shell de UI, design system, PWA, navegação por perfil e boas-vindas

| Campo | Valor |
|---|---|
| Fase | 1 |
| Iniciar após | T02 |
| Concluir requer | — |
| Gate humano | — |
| Decisões | D0001, D0047, D0048, D0075, D0076 (botão de notificações), D0044 (PWA da equipe) |
| PRD | §4.1, §4.2, §4.3 (P01), §7.9 |
| Área de escrita | `src/ui/**`, `src/routes/__root.tsx`, layouts (`src/routes/(publico)/route.tsx`, `src/routes/app/route.tsx`, `src/routes/equipe/route.tsx`, `src/routes/admin/route.tsx`), `src/routes/(publico)/boas-vindas/**`, `public/manifest.webmanifest`, service worker |
| Não tocar | Telas de negócio (cada task faz as suas) |
| Paralelizável com | T03, T04 |

## Objetivo

Entregar a fundação visual e de navegação que todas as telas usam: design system com tokens vindos da configuração da marca, componentes de estado, layouts mobile (abas por perfil) e desktop (backoffice), PWA instalável e as boas-vindas.

## Ler antes

PRD §4; [docs/referencias-visuais/README.md](../../referencias-visuais/README.md) e algumas imagens das pastas `cliente` e `pro` (inspiração; não copiar marca nem layout literal).

## Escopo

1. **Tokens** (cores, tipografia, espaçamento, raio, sombra) como variáveis CSS alimentadas pela configuração da marca (interface `BrandConfig` com valores padrão neutros; T08 fornece os reais).
2. **Componentes base:** Button (com estado enviando e bloqueio de duplo clique), Input, PhoneInput, OtpInput, Select, Checkbox, DateStrip, TimeSlotGrid, Card, Sheet/Modal de confirmação com consequências, Toast/aria-live, Badge de estado, EmptyState, ErrorState (com tentar de novo), LoadingSkeleton, AccessDenied, PendingExternal (protocolo + próximos passos), MoneyText, DateTimeText (fuso da loja, formato completo para eventos críticos), Table e Filters para desktop.
3. **Helpers de mutação na UI:** hook que integra `Result` (`ok`/`pending`/`error`) com estados de tela, mantém entradas após erro e exibe conflito com alternativas.
4. **Layouts:**
   - público (Planos, Serviços, Barbeiros, Entrar);
   - cliente (abas Início, Agendar, Plano, Perfil);
   - equipe (Agenda, Atendimentos, Ganhos, Perfil; + Gestão para admin);
   - alternância de contexto Cliente/Equipe para papéis combinados;
   - backoffice desktop `/admin` com menu lateral (Painel, Clientes, Agenda, Equipe, Serviços, Planos, Jornadas, Financeiro, Comissões, Correções, Configurações, Suporte, Privacidade); no mobile, rotas `/admin` mostram "Disponível no computador".
   - botão de notificações no topo das telas iniciais (a central é T30; aqui um slot com contador).
5. **Guardas de rota no cliente** apenas para UX (redirecionar para login preservando destino); segurança real fica no servidor.
6. **PWA:** manifest com nome/ícones da configuração, service worker com cache do shell e página offline simples; sem cache de dados pessoais.
7. **Boas-vindas (P01):** 2–3 telas configuráveis, "Pular" sempre visível; mostra uma vez por dispositivo **e versão** (marca em localStorage com try/catch); nunca para logado; nunca quando a entrada é deep link; acessível depois em Perfil → Como funciona (componente reutilizável).
8. **Acessibilidade:** foco visível, alvos ≥ 44 px, contraste AA, navegação por teclado no desktop.
9. Página `/_dev/ui` (só em desenvolvimento) com catálogo dos componentes e estados.

## Fora do escopo

Conteúdo das telas de negócio; central de notificações real (T30); instalação guiada de push (T30).

## Contratos (publica)

Componentes em `src/ui`, layouts, `BrandConfig` (interface), helpers de mutação, `WelcomeGate`.

## Regras e checklist defensivo

- Nenhum componente calcula regra de negócio (preço, cobertura, prazo): recebe pronto do servidor.
- Formatação de dinheiro e data só pelos componentes `MoneyText`/`DateTimeText`.
- Tudo funciona sem localStorage (navegação privada).

## Testes obrigatórios

- Unit/component: estados de mutação (enviando, ok, pending, conflito, erro), bloqueio de duplo envio.
- E2E: boas-vindas aparecem uma vez; não aparecem logado; não aparecem em deep link; reaparecem com nova versão; abas corretas por papel (com sessões de teste); `/admin` no mobile mostra aviso.
- Lighthouse/axe básico sem violações graves nas páginas de exemplo.

## Critérios de aceite

Catálogo `/_dev/ui` completo; layouts navegáveis nos dois viewports; PWA instalável (manifest válido).

## Entrega

Relatório (PRD §11.5) com prints do catálogo e dos layouts.
