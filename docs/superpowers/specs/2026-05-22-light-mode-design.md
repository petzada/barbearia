# Light Mode — Design Spec

**Data:** 2026-05-22
**Objetivo:** Converter a aplicação do tema dark (Linear-inspired) para um light mode limpo, com profundidade via sombras em vez da escada de surfaces.

## Princípio: 3 cores + teal

| Papel | Hoje (dark) | Light mode |
|---|---|---|
| Background geral | `#010102` | **`#EAEAEA`** |
| Card / painel (branco gelo) | transparente + borda | **`#FFFFFF`** + sombra (sem borda) |
| Tipografia | `#f7f8f8` | **`#111111`** (preto) |
| Destaque / CTA / accent | `#05384b` + bege `#e4d0b0` | **teal `#0E7C86`** |

Verde de status (`--success`) permanece como cor semântica (status apenas), não conta como cor de marca.

## Descoberta da análise de código

Todos os usos do token `--pastel` (bege) no código são **funcionais/accent**: focus rings (`ring-pastel`), aba ativa do menu, linha do "agora" da agenda (`border-pastel`/`bg-pastel`), links (`text-pastel`), ícones de serviço, dot ativo do carrossel, ring de avatar, iniciais de barbeiro. **Não existe bege puramente decorativo** no código. Portanto o token `--pastel` inteiro é remapeado para **teal**; não sobra bege para virar preto.

A arquitetura é dirigida por tokens CSS (`globals.css`), com ~106 referências a tokens semânticos em 37 arquivos. A virada de tema acontece majoritariamente em `globals.css`; ajustes pontuais em poucos componentes.

## Tokens em `src/app/globals.css`

`:root` e `.dark` continuam **espelhados** (mesma estratégia atual), agora com valores light, para que os variants `dark:` existentes resolvam para os mesmos tokens light e nada quebre.

### Escala de tinta (preto → cinza)
- `--ink: #111111` (texto principal)
- `--ink-muted: #3A3A3A`
- `--ink-subtle: #6B6B6B`
- `--ink-tertiary: #9A9A9A`

### Surfaces colapsadas (micro-passos do mesmo neutro)
- `--surface-1: #FFFFFF` (cards elevados)
- `--surface-2: #F6F6F6` (hover/featured — distinção mínima sobre branco)
- `--surface-3: #EAEAEA` (inputs / áreas recuadas, com borda)
- `--surface-4: #E0E0E0` (recuo mais profundo)
- `--hairline: #E6E6E6` (divisores e bordas sutis)
- `--hairline-strong: #D4D4D4`

### Marca + semântico
- `--success: #1E9E3E` (verde ajustado para fundo claro; mantém papel de status)
- `--cta: #0E7C86` (teal médio vivo)
- `--cta-foreground: #FFFFFF` (texto branco sobre teal — contraste AA para texto grande/botões)
- `--pastel: #0E7C86` (remapeado para teal — cobre todos os accents funcionais)

### Tokens shadcn
- `--background: #EAEAEA`
- `--foreground: #111111`
- `--card: #FFFFFF` · `--card-foreground: #111111`
- `--popover: #FFFFFF` · `--popover-foreground: #111111`
- `--primary: var(--cta)` · `--primary-foreground: var(--cta-foreground)`
- `--secondary: #FFFFFF` · `--secondary-foreground: #111111`
- `--muted: #EAEAEA` · `--muted-foreground: #6B6B6B`
- `--accent: #F0F0F0` · `--accent-foreground: #111111`
- `--destructive`: manter (vermelho oklch — legível em fundo claro)
- `--border: #E6E6E6` · `--input: #D4D4D4`
- `--ring: var(--cta)` (focus rings em teal; antes era `--pastel`)
- `--chart-*`: manter como está (não afetam o app principal)
- `--sidebar*`: alinhar ao tema light (sidebar `#FFFFFF`, foreground `#111`, accent `#F0F0F0`, border `#E6E6E6`, ring teal)

### Sombra dos cards (novo token)
Projeção da **esquerda → direita e abaixo** (luz no topo-esquerdo): offset-x positivo, offset-y positivo. Leve, porém visível.

```css
--shadow-card: 6px 8px 24px -6px rgba(17,17,17,0.12), 2px 3px 8px -3px rgba(17,17,17,0.08);
```

Exposto via `@theme` (namespace `--shadow-*` do Tailwind v4) gerando a utility `shadow-card`.

### Ajustes em `@layer base`
- `::selection`: mantém `color-mix` com `--primary` (teal) mas a cor do texto passa de `var(--ink)` (que agora é preto) — ok.
- O autofill hack do login (ver abaixo) sai do globals (é inline no componente).

## Mudanças em componentes

### `src/components/ui/card.tsx`
- Remover `border border-hairline` do container do `Card`.
- Trocar `bg-transparent` → `bg-card`.
- Adicionar `shadow-card`.
- `CardFooter`: manter `border-t border-hairline` (divisor interno) e `bg-transparent` (herda o branco do card).

### `src/app/(auth)/login/auth-form.tsx`
- Substituir os hacks de autofill dark: `shadow-[inset_0_0_0_1000px_#1c1d20]` → fundo claro (`#EAEAEA`), e `[-webkit-text-fill-color:#f7f8f8]` → preto (`#111111`). Aplicar nos três trechos `[&:-webkit-autofill]`.
- O restante (`bg-surface-3`, `text-ink`, `ring-pastel`) resolve automaticamente via tokens.

### `src/components/bottom-nav.tsx`
- Barra flutuante "glass": `bg-surface-2/25` + `shadow-[0_8px_32px_rgba(0,0,0,0.35)]` → glass clara (`bg-surface-1/70` ou `bg-white/70`) com sombra suave clara (`shadow-card` ou `shadow-[0_8px_32px_rgba(17,17,17,0.12)]`); `border-hairline/30` permanece (resolve claro).
- Botão central `bg-cta shadow-md`: mantém (teal + sombra padrão).
- Estados `text-pastel`/`ring-pastel` viram teal automaticamente.

### Painéis `bg-surface-1` que agem como card
Adicionar `shadow-card` aos painéis que funcionam como cartões elevados (ex.: `agenda-day-panel`, `agenda-day-timeline`, blocos em `agendar/*`, `gestao`, `admin`). Divisores e bordas internas usam `--hairline` (claro) e permanecem.

## Acessibilidade / contraste
- Texto preto `#111` sobre `#EAEAEA` e sobre `#FFFFFF`: contraste alto (AA/AAA).
- Branco sobre teal `#0E7C86`: ~4.4:1 — passa AA para texto grande/botões (rótulos de botão são bold/≥14px). Se algum texto pequeno teal-on-white falhar, usar teal só em ≥14px bold ou escurecer levemente o teal.
- Teal `#0E7C86` sobre branco/`#EAEAEA` para ícones/links: legível.

## Fora de escopo
- Não criar toggle de tema (app é single-theme).
- Não redesenhar layout, tipografia ou espaçamento — apenas cor, fundo de card e sombra.
- Não alterar `--chart-*` nem `--destructive`.

## Critério de sucesso
- App inteiro em light: fundo `#EAEAEA`, cards brancos com sombra suave projetada à direita/abaixo, texto preto, accents/CTAs em teal.
- Nenhum resíduo de bege.
- Nenhum fundo escuro remanescente (login autofill, bottom-nav glass corrigidos).
