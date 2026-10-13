# 0032 — Jornada definida pelo admin; bloqueio pontual pelo barbeiro, só em horário livre

- **Data:** 2026-10-13
- **Status:** aceita (detalhada por [0059](0059-credito-de-reposicao.md), [0063](0063-notificacao-nao-e-aceite.md) e [0069](0069-jornada-e-duracao-nao-alteram-reservas.md))
- **Substitui:** "gestão da própria agenda e horários de trabalho" pelo barbeiro, de [0003](0003-escopo-funcional-por-perfil.md)

## Contexto
Com autonomia total, um barbeiro poderia esvaziar o sábado sem o dono saber. Com aprovação para tudo, o dono vira gargalo.

## Decisão
- **Jornada semanal** (dias, horário de início e fim, intervalos) de cada barbeiro: **definida e editada pelo admin**. O barbeiro vê a própria jornada.
- **Bloqueios pontuais** (consulta, folga, saída antecipada): **o barbeiro cria sozinho**. O admin **é notificado** e pode desfazer. O admin edita jornada e bloqueios de todos.
- **Bloqueio só em horário livre.** O app não deixa o barbeiro bloquear por cima de horário já marcado. Nesse caso, ele pede ao admin, que **cancela ou transfere manualmente** os atendimentos.

## Consequências
- Cancelamento feito pela barbearia (admin) **nunca custa ao cliente**: ~~o uso do plano volta~~ → o benefício pago vira **crédito de reposição de 30 dias** ([0059](0059-credito-de-reposicao.md)), e o cliente recebe aviso no WhatsApp com link para remarcar.
- ~~Transferência para outro barbeiro feita pelo admin também avisa o cliente.~~ → transferência exige **concordância** do cliente ([0063](0063-notificacao-nao-e-aceite.md)).

## Revisão adversarial (2026-10-13)
- Autonomia de bloqueio do barbeiro **mantida**: a proposta de limite semanal de horas com aprovação acima dele foi **rejeitada** (Q24). Cancelamento pela barbearia gera crédito de reposição ([0059](0059-credito-de-reposicao.md)); transferência exige concordância ([0063](0063-notificacao-nao-e-aceite.md)); mudança de jornada mostra conflitos ([0069](0069-jornada-e-duracao-nao-alteram-reservas.md)).
