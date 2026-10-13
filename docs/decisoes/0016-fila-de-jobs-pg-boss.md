# 0016 — Fila de jobs: pg-boss agora, Redis só se precisar

- **Data:** 2026-10-13
- **Status:** aceita

## Contexto
A proposta inicial do dono era usar Redis do Railway "por garantia". No review apareceu que, para este caso, o pg-boss é mais seguro: o job nasce na mesma transação do Postgres que grava o dado (pagamento confirmado → assinatura ativada → aviso agendado, tudo ou nada), usa o backup do Postgres e não acrescenta serviço por barbearia. Com Redis, a mesma garantia exigiria uma tabela outbox.

## Decisão
- Começar com **pg-boss**, usando o Postgres que já existe.
- A fila fica escondida atrás de uma **interface própria (`JobQueue`)**, para dar para trocar por Redis/BullMQ no futuro sem reescrever os jobs.
- Um **processo worker separado** no Railway consome a fila (o mesmo repositório com outro comando de start).

## Quando reavaliar
- Volume de jobs que o Postgres não aguente com folga, ou necessidade de painel visual de filas que o pg-boss não atenda.

## Revisão adversarial (2026-10-13)
- pg-boss mantido. Depois de restaurar backup, automações só voltam após conciliação, sem efeitos duplicados ([0078](0078-versoes-por-etapas-e-recuperacao-com-conciliacao.md)).
