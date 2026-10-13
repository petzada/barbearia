# 0074 — Filtro opcional por barbeiro na marcação

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q28
- **Substitui:** em [0036](0036-fluxo-de-marcacao-horario-primeiro.md), "sem filtro 'Meu barbeiro': foi proposto e recusado"

## Contexto
O cliente fiel a um barbeiro precisava testar horário por horário até achar o profissional dele (caso Wilker, `docs/pesquisas/20-objecoes.md`). Na revisão, o dono do produto aprovou o filtro.

## Decisão
- O fluxo **serviço → horário → barbeiro livre** continua sendo o **padrão**.
- Há um **filtro opcional por barbeiro**: mostra só os horários em que ele está livre **e** habilitado para **todos** os serviços escolhidos ([0037](0037-plano-vale-com-qualquer-barbeiro-e-habilitacao-por-servico.md)).
