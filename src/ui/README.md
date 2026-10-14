# ui

Design system, layouts, PWA e navegação por perfil. Dona: **T05**. Telas de negócio (cada task a sua) importam de `~/ui` e **nunca recalculam regra**: preço, cobertura, prazo e disponibilidade chegam prontos do servidor.

## Como usar

- **Dinheiro e data** só por `MoneyText` (centavos inteiros) e `DateTimeText` (fuso da loja; `format="completo"` em prazos, cobranças e fim de ciclo). Um teste (`tests/unit/ui-regras.test.ts`) proíbe `toLocale*`, `Intl.*`, `toFixed` e `formatBRL` fora desses componentes.
- **Mutação:** `useMutation({ action })` liga o `Result` (`ok`/`pending`/`error`) aos estados de tela (`idle`, `sending`, `done`, `pending`, `conflict`, `failed`). Bloqueia duplo envio, preserva a entrada (`lastInput`, `fieldErrors`) e reaproveita a `idempotencyKey` enquanto a entrada for a mesma. `MutationStatus` é a apresentação padrão (pendente com protocolo, conflito com alternativas, falha com "Tentar de novo").

  ```tsx
  const salvar = useMutation({
    action: (input, { idempotencyKey }) => cancelarReservaRemoto({ ...input, idempotencyKey }),
  })
  <Button sending={salvar.isSending} onClick={() => salvar.submit({ reservaId })}>Cancelar</Button>
  <MutationStatus mutation={salvar} conflictAlternatives={alternativas} renderDone={...} />
  ```

  O contrato de erro não carrega alternativas: a tela as busca (ex.: nova disponibilidade) e as passa em `conflictAlternatives`.

- **Estados de consulta:** `LoadingSkeleton`, `EmptyState` (a ação é obrigatória), `ErrorState` (com "Tentar de novo"), `AccessDenied`.
- **Marca:** `BrandConfig` (cores, fonte, raios, ícones, fuso, boas-vindas) vira variáveis CSS em `:root` por `<BrandStyle>`. Padrões neutros em `defaultBrand`; **T08** registra a marca real com `setBrand(...)` antes do render. Valores são validados (não aceitam `;`, `url()`, comentário).
- **Catálogo:** `/_dev/ui` (somente `vite dev`; 404 em produção).

## Navegação e layouts

| Área       | Rota                                                                 | Layout                | Abas                                                                |
| ---------- | -------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------- |
| Público    | `/`, `/planos`, `/servicos`, `/barbeiros`, `/entrar`, `/boas-vindas` | `(publico)/route.tsx` | Planos · Serviços · Barbeiros · Entrar                              |
| Cliente    | `/app/*`                                                             | `app/route.tsx`       | Início · Agendar · Plano · Perfil                                   |
| Equipe     | `/equipe/*`                                                          | `equipe/route.tsx`    | por papel (`staffTabs`): barbeiro, admin-barbeiro (+ Gestão), admin |
| Backoffice | `/admin/*`                                                           | `admin/route.tsx`     | menu lateral com 13 áreas; no celular, "Disponível no computador"   |

- **Guardas só de UX** (`guardArea`, `decideAccess`): sem sessão → `/entrar?destino=<caminho>` (`safeDestination` recusa destino externo); contexto errado → redireciona; sem papel → acesso negado. Segurança real é do servidor.
- **Rotas-esqueleto:** os destinos de abas que ainda não têm tela usam `app/$secao.tsx`, `equipe/$secao.tsx`, `admin/$secao.tsx` e `(publico)/$pagina.tsx`, com os títulos e donas em `layouts/placeholders.ts`. **Para entregar uma tela, crie o arquivo de rota próprio** (ex.: `src/routes/app/agendar.tsx`): ele tem prioridade sobre a genérica e nada precisa ser apagado. Um teste garante que todo destino da navegação tem tela ou esqueleto.
- **Notificações:** `NotificationButton` aparece no topo de `/app` e `/equipe`; T30 chama `setNotificationCount(n)`.

## Sessão da UI

`UiSession` (`actorId`, `nome`, `roles`) é lida por `UiSessionSource`. **T04 deve publicar `src/modules/identity/ui-session.ts` exportando `uiSessionSource`** (consulta ao servidor); o T05 a carrega por `import.meta.glob`. Depois de login/logout/troca de papel, chame `invalidateUiSession()`.

Em `vite dev`, o cookie `dev_sessao=cliente,barbeiro` (E2E: `entrarComo` em `tests/e2e/helpers/sessao.ts`) simula sessão. Só existe em modo `development`: o ramo é removido do build (vigiado por teste; confira com `grep dev_sessao dist`). Detecta-se o modo por `import.meta.env.MODE`, **nunca** por `DEV`/`PROD`: o Vite os deriva do `NODE_ENV` do `.env.local` (que em máquina de dev vale `development`).

## Boas-vindas (P01, D0048)

`WelcomeGate` (na entrada `/`) decide: logado → vai ao contexto; visitante novo ou de versão antiga → `/boas-vindas`; demais → conteúdo. Uma vez por dispositivo **e versão** (`localStorage` com try/catch e fallback em memória), nunca para logado, nunca se a visita começou fora de `/` (deep link, `initial-entry.ts`). `WelcomeCarousel` é o componente reutilizável de **Perfil → Como funciona** (`mode="revisao"`); a tela do Perfil é de T32.

## PWA

`public/manifest.webmanifest` (valores padrão; T08 pode substituir por rota dinâmica), ícones neutros em `public/icons/`, `public/sw.js` e `public/offline.html`. O service worker só guarda arquivos estáticos (`/assets/`, `/icons/`, manifest, página offline); **nunca** HTML de rota nem chamadas ao servidor. Registrado só em produção (`registerServiceWorker`).

## Testes

`tests/unit/ui-*.test(.tsx)` (estados de mutação, duplo envio, componentes em jsdom, navegação, boas-vindas, marca, manifest e service worker executado em `vm`) e `tests/e2e/*.spec.ts` (boas-vindas, abas por papel, `/admin` no celular, catálogo, PWA, axe A/AA, alvos ≥ 44 px). `tests/e2e/helpers/teste.ts` espera o atributo `data-hidratado` do `<html>` antes de interagir. Porta do E2E: `E2E_PORT` (padrão 3100). Prints: `PRINTS_DIR=<pasta> pnpm test:e2e prints`.
