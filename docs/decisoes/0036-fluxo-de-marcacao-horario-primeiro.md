# 0036 — Marcação: serviço → horário → barbeiro livre

- **Data:** 2026-10-13
- **Status:** aceita (filtro opcional por barbeiro adicionado pela [0074](0074-filtro-opcional-por-barbeiro.md))

## Decisão
- Fluxo de marcação do cliente:
  1. escolhe o **serviço** (ou serviços);
  2. escolhe o **horário**;
  3. vê os **barbeiros livres naquele horário**, habilitados para o serviço ([0037](0037-plano-vale-com-qualquer-barbeiro-e-habilitacao-por-servico.md)), e escolhe um.
- Se **nenhum barbeiro estiver livre** no horário escolhido, o app mostra o **barbeiro e horário disponíveis mais próximos**.
- ~~Sem filtro "Meu barbeiro": foi proposto e recusado.~~ → filtro opcional por barbeiro aprovado na revisão adversarial ([0074](0074-filtro-opcional-por-barbeiro.md)).

## Riscos aceitos
- O cliente fiel a um barbeiro precisa testar horários até o barbeiro dele aparecer como livre. É a frustração do caso Wilker (`docs/pesquisas/20-objecoes.md`). → Mitigado pelo filtro opcional ([0074](0074-filtro-opcional-por-barbeiro.md)).

## Revisão adversarial (2026-10-13)
- Fluxo padrão mantido, com filtro opcional por barbeiro ([0074](0074-filtro-opcional-por-barbeiro.md)).
