# Revisão de consistência UI/UX — 30 telas

Revisão de código de todas as telas contra `docs/DECISOES.md`, feita por um
subagente (Fable, esforço baixo). Caminhos relativos a `src/`. Nada foi corrigido
ainda: este é o backlog para decisão.

## Alta: quebra fluxo ou acessibilidade, ou contradiz decisão

1. **Confirmação de ação destrutiva em 4 padrões:**
   - `window.confirm` nativo em `components/agenda/entry-sheet.tsx:144`, `app/admin/clube/club-admin-client.tsx:158` e `app/admin/gestao/whatsapp/whatsapp-panel.tsx:157`;
   - `AlertDialog` em `app/(cliente)/clube/club-actions.tsx` e `app/perfil/profile-forms.tsx`;
   - confirmação inline em `components/appointments/appointments-list.tsx:215`;
   - **sem confirmação** ao remover bloqueio (`app/barbeiro/bloqueios/blocks-list.tsx:81`), feriado (`admin/gestao/horarios/hours-settings.tsx:138`) e convite (`admin/gestao/equipe/team-manager.tsx:115`).

   → Um `ConfirmDialog` único em todo lugar.
2. **Folhas inferiores com 5 estruturas:** alça e X juntos (`booking/confirm-sheet.tsx`, `appointments-list.tsx`), ou sem alça (`entry-sheet.tsx`, `profile-forms.tsx`), ou largura total no desktop (`agenda/booking-calendar-sheet.tsx`). → Tudo via `components/kit/bottom-sheet.tsx`.
3. **A alça da folha é só decorativa** (não há gesto de arrastar para fechar). → Implementar swipe ou manter X/"Fechar" consistente.
4. **Chips iguais com comportamentos opostos:** em `agenda/new-entry-sheet.tsx:222` o chip executa o bloqueio na hora; em `agenda/block-form-sheet.tsx:112` só seleciona. → Chips só selecionam.
5. **"Falta" aparece em verde de sucesso** (`agenda/agenda-day-timeline.tsx:282`, `agenda/day-list.tsx:80`), mas o padrão é `warning`. → Derivar a cor de `ENTRY_STATUS_BADGE`.
6. **Rótulos de pagamento divergentes:**
   - "Pagar no local" × "Pagar na barbearia" × "Balcão";
   - "Pix no balcão" × "Pix (balcão)";
   - "Cartão" × "Cartão (balcão)".

   → Dicionário único `PAYMENT_LABELS`.
7. **Alvos de toque menores que 44px:** `Switch`, botões-ícone de remover (40px), "Voltar" (h-10), `PeriodFilter` (h-9), chips do financeiro (h-9) e chips de variável (h-8).
8. **`aria-pressed` em links:** `agenda/agenda-view.tsx`, `admin/clube/page.tsx`, `admin/financeiro/page.tsx`, `admin/gestao/avaliacoes/page.tsx` e `whatsapp-panel.tsx`. → Usar `aria-current`.
9. **Contraste insuficiente:** texto `warning` sobre `warning/12` dá ≈3,2:1, e texto `success` sobre branco ≈3,3:1. → Tokens `--warning-ink` e `--success-ink`.
10. **Estados vazios sem "próxima ação":** sem horários (`booking/schedule-step.tsx:52`), sem barbeiros, erro ao gerar Pix sem "Tentar de novo", Ganhos, Financeiro e Avaliações.
11. **"Criar/novo" em três lugares:** no header, em botão de largura total no corpo ou como linha da lista; e um "Novo" em Agendamentos que duplica o botão central. → Sempre em `PageHeader.actions`.
12. **Cabeçalho do wizard fora do padrão:** título xl, voltar só com ícone e `push("/inicio")` (`booking/booking-wizard.tsx:129`). → `PageHeader`.

## Média: inconsistência visível

13. Abas e segmentados com 5 alturas diferentes. → Um `Segmented` com h-11.
14. `chipClass` copiada à mão no financeiro e no clube admin.
15. Dois calendários mensais com estilos diferentes (`booking/availability-calendar.tsx` × `agenda/month-calendar.tsx`).
16. Ação destrutiva secundária com 4 aparências diferentes.
17. O botão de confirmar no AlertDialog muda de variante (teal × destructive), e o de desistir alterna entre "Manter" e "Voltar".
18. Verbos sem regra: "Salvar plano", "Salvar lembretes", "Marcar encaixe", "Bloquear 12:00–13:00"…
19. Status em duas linguagens: bolinha na lista × `Badge` no card, na folha e na agenda.
20. `Textarea` com estilo diferente do `Input` (raio, fundo, padding).
21. Datas formatadas com `split` e capitalização variando (`capitalize`, maiúsculas ou minúsculas).
22. Intervalos de horário com e sem espaço ("09:00 – 10:00" × "09:00–10:00").
23. Plurais feitos à mão em vez de `countLabel`.
24. Título da aba diferente do título da tela ("Hoje" × "Oi, Nome!"; "Minha agenda" × "Agenda").
25. Números de destaque em 4 tamanhos (48, 44, 40 e 24px).
26. O card de plano da landing (`app/page.tsx:123`) não reutiliza `club/plan-card.tsx`.
27. Seleção visual em três linguagens (chip teal, segmentado branco, card com anel).
28. Ações sem feedback de carregamento (linha do clube admin) e skeleton genérico em telas que não são lista.
29. Estados vazios feitos ora com `EmptyState`, ora com `<p>` solto.
30. Ação inline em duas formas na tela de Horários.
31. Botões-ícone que não usam as variantes de `Button`.
32. No login, o erro aparece inline no telefone e no código, mas em toast no Google.
33. Avatar sem foto na tela de confirmação e na sidebar; anel `ring-white` fixo no código.

## Baixa: polimento

34. ~30 cores e raios fixos no código, fora dos tokens (`text-white`, `rounded-[22px]`…).
35. AlertDialog com borda e rodapé cinza, destoando dos cards sem borda.
36. Badges com classes avulsas ("Ativa", "Recomendado") e um badge usado como aviso longo.
37. A linha de WhatsApp na folha do barbeiro difere da `SettingsLink`.
38. A busca do Clube admin não tem botão de limpar; o botão "CSV" deveria se chamar "Exportar".
39. Texto: "vence 02/11" em minúscula num badge e "Te esperamos!" misturando "te" com "você". → Usar "você" sempre.

## Padrões a unificar

- **Folha inferior:** sempre `BottomSheet` (alça com swipe ou X, `bg-background`, título xl, um primário `lg` no fim, destrutivo `ghost` abaixo, `sm:max-w-lg`).
- **Confirmação:**
  - `ConfirmDialog` para tudo que for irreversível;
  - título em pergunta e uma frase de consequência;
  - "Manter" (outline) e verbo `destructive`.
- **Ações:**
  - Botões: um primário `lg` por tela; secundário `outline`; terciário e destrutivo `ghost`.
  - Criar algo: sempre no cabeçalho (`size="sm"` com "+").
  - Verbos:
    - "Salvar" para edição;
    - "Cancelar" para agendamentos e assinaturas;
    - "Remover" para bloqueios, feriados e benefícios;
    - "Excluir" só para a conta.
- **Linhas de lista:** `rowClass` (min-h-14, ícone 36px em teal-soft, chevron), com variante de Switch e estado `pending`.
- **Badge de status:** `StatusBadge` único. Mapeamento de cores:
  - `soft`: confirmado;
  - `success`: concluído ou pago;
  - `warning`: falta ou pendente;
  - `muted`: cancelado ou "pagar na barbearia".
- **Seleção:** `Segmented` para 2–4 opções exclusivas; `chipClass` para filtros; card com anel só quando a opção tem título e descrição. Chips nunca executam ação.
- **Estado vazio:** sempre `EmptyState` com botão de próxima ação, com variante `compact`.
- **Formatação:** fontes únicas `formatTimeRange`, `formatDayMonth`, `formatWeekdayShort`, `formatDateRange`, `PAYMENT_LABELS` e `countLabel`.

## Verificação (2ª passada)

Uma segunda revisão (Fable, esforço baixo) conferiu os 39 itens no código: 31
confirmados, 8 com resíduo e nenhum sem resolver. Ela também levantou 15 pontos
novos de polimento. Tudo isso foi corrigido em seguida:

- **Resíduos:**
  - rótulos de pagamento vêm todos do dicionário (inclusive os filtros do financeiro);
  - "Reenviar código" virou componente único com alvo de 44px;
  - regra de verbos: "Novo X" no cabeçalho e no vazio, "Criar X"/"Bloquear horário" na folha;
  - lembrete e prévia do WhatsApp com `formatDayLabel`;
  - plural com `countLabel` no servidor;
  - plano do clube admin em chips;
  - Pix expirado e agenda vazia com `EmptyState`;
  - véu de fotos e folhas com o token `--scrim`. O `themeColor` continua literal porque a meta tag não lê variáveis CSS; as cores da marca Google também.
- **Novos:**
  - erro do Pix: "Tentar de novo" e "Ver meus agendamentos";
  - `FieldLabel` único, e `OptionGroup`/`Segmented` com rótulo visível;
  - `HubRow` substituído por `SettingsLink` com `valueTone`;
  - bloqueios em grupo de linhas com marcador tracejado;
  - troca de modo da sidebar com `SegmentedNav` vertical;
  - botão com variante `on-dark`;
  - `RatingStars`/`RatingInput` únicos;
  - ícones nas linhas de Regras e Barbearia;
  - `staticRowClass` nas listas informativas;
  - calendário como grupo de botões com a data completa no rótulo;
  - `chipRowClass` em todas as fileiras de filtros.
