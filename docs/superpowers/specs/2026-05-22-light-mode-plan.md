# Light Mode — Plano de Implementação

Spec de referência: `2026-05-22-light-mode-design.md`

Ordem de execução pensada para validar cedo: token swap global primeiro (vira o tema inteiro de uma vez), depois ajustes pontuais nos componentes que têm cor hardcoded ou fundo escuro, e por fim verificação no browser.

---

## Etapa 1 — Tokens em `src/app/globals.css`

Bloco `:root, .dark` (mantêm-se espelhados). Substituir os valores dark pelos light:

### Surface ladder
```css
--surface-1: #FFFFFF;
--surface-2: #F6F6F6;
--surface-3: #EAEAEA;
--surface-4: #E0E0E0;
--hairline: #E6E6E6;
--hairline-strong: #D4D4D4;
```

### Ink scale
```css
--ink: #111111;
--ink-muted: #3A3A3A;
--ink-subtle: #6B6B6B;
--ink-tertiary: #9A9A9A;
```

### Marca + semântico
```css
--success: #1E9E3E;
--cta: #0E7C86;
--cta-foreground: #FFFFFF;
--pastel: #0E7C86;   /* remapeado para teal: cobre todos os accents funcionais */
```

### Tokens shadcn
```css
--background: #EAEAEA;
--foreground: #111111;
--card: #FFFFFF;
--card-foreground: #111111;
--popover: #FFFFFF;
--popover-foreground: #111111;
--primary: var(--cta);
--primary-foreground: var(--cta-foreground);
--secondary: #FFFFFF;
--secondary-foreground: #111111;
--muted: #EAEAEA;
--muted-foreground: #6B6B6B;
--accent: #F0F0F0;
--accent-foreground: #111111;
--destructive: oklch(0.704 0.191 22.216);  /* manter */
--border: #E6E6E6;
--input: #D4D4D4;
--ring: var(--cta);   /* antes era var(--pastel) */
/* --chart-* : manter */
--sidebar: #FFFFFF;
--sidebar-foreground: #111111;
--sidebar-primary: var(--cta);
--sidebar-primary-foreground: var(--cta-foreground);
--sidebar-accent: #F0F0F0;
--sidebar-accent-foreground: #111111;
--sidebar-border: #E6E6E6;
--sidebar-ring: var(--cta);
```

### Novo token de sombra (no bloco `@theme inline`)
```css
--shadow-card: 6px 8px 24px -6px rgba(17,17,17,0.12), 2px 3px 8px -3px rgba(17,17,17,0.08);
```
Gera a utility `shadow-card` (namespace `--shadow-*` do Tailwind v4). Projeção esquerda→direita e abaixo.

**Validação da etapa:** app deve ficar majoritariamente light só com isso. Próximas etapas limpam os pontos hardcoded.

---

## Etapa 2 — `src/components/ui/card.tsx`

No container do `Card` (linha ~15):
- Remover `border border-hairline`.
- Trocar `bg-transparent` → `bg-card`.
- Adicionar `shadow-card`.

`CardFooter`: manter `border-t border-hairline` (divisor interno); `bg-transparent` herda o branco do card — manter.

---

## Etapa 3 — `src/app/(auth)/login/auth-form.tsx`

Linha ~17 (`inputClassName`), trocar os hacks de autofill dark:
- `[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#1c1d20]` → `...#EAEAEA`
- `[&:-webkit-autofill]:[-webkit-text-fill-color:#f7f8f8]` → `...#111111`
- `[&:-webkit-autofill:focus]:shadow-[inset_0_0_0_1000px_#1c1d20]` → `...#EAEAEA`

O resto da classe (`bg-surface-3`, `text-ink`, `ring-pastel`) resolve via tokens.

---

## Etapa 4 — `src/components/bottom-nav.tsx`

Barra flutuante (linha ~85):
- `bg-surface-2/25` → glass clara: `bg-white/70` (ou `bg-surface-1/70`).
- `shadow-[0_8px_32px_rgba(0,0,0,0.35)]` → sombra suave clara: `shadow-[0_8px_32px_rgba(17,17,17,0.12)]`.
- `border-hairline/30` e `backdrop-blur-2xl`: manter.

Botão central `bg-cta shadow-md` (linha ~44): manter (teal + sombra). Estados `text-pastel`/`ring-pastel` viram teal via token.

---

## Etapa 5 — Painéis `bg-surface-1` que agem como card

Auditar os arquivos com `bg-surface-1` e aplicar `shadow-card` onde o elemento é um cartão/painel elevado (não onde é só um chip/avatar/ícone redondo). Candidatos a revisar:
- `src/app/(app)/agenda/agenda-day-panel.tsx`
- `src/components/agenda/agenda-day-timeline.tsx`
- `src/app/(app)/agendar/barber-step.tsx`, `barber-topbar.tsx`, `schedule-step.tsx`, `service-step.tsx`
- `src/app/(app)/gestao/page.tsx`, `src/app/(app)/admin/page.tsx`
- `src/components/home/*`

Critério: bloco retangular com conteúdo (card) → `shadow-card`. Elemento circular pequeno (avatar/ícone) → não.

Também verificar resíduos de fundo/sombra escura hardcoded (ex.: `rgba(0,0,0,...)`, hex escuros) fora dos tokens e corrigir.

---

## Etapa 6 — Validação no browser

1. Subir dev server (`npm run dev`).
2. Navegar: home (cliente e barbeiro), login, agenda (timeline + "agora"), agendar (wizard 4 etapas), gestão, admin, conta.
3. Checar:
   - Fundo geral `#EAEAEA`; cards brancos com sombra à direita/abaixo.
   - Texto preto, legível.
   - Accents/CTAs/focus/aba ativa/linha do "agora" em teal.
   - Sem resíduo de bege; sem fundo/sombra escura remanescente.
   - Autofill do login claro com texto preto.
4. Ajustar contrastes pontuais se algum texto pequeno teal-on-white falhar AA.

---

## Riscos / atenção
- `.dark` espelhado com light: variants `dark:*` em componentes (ex.: auth-form `dark:bg-surface-3!`) passam a resolver para tokens light — comportamento desejado, nada quebra.
- `shadow-card` precisa estar no namespace `@theme` correto para virar utility; se não gerar, aplicar via `shadow-[...]` inline como fallback.
- Verde `--success` e vermelho `--destructive` permanecem como cores semânticas — esperado, não são "4ª cor de marca".
