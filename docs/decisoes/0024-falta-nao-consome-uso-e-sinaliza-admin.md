# 0024 — Falta: não consome uso do plano e sinaliza o admin

- **Data:** 2026-10-13
- **Status:** substituída por [0025](0025-uso-do-plano-ciclo-e-consumo.md): a falta passa a consumir uso; a sinalização ao admin continua
- **Fecha:** a regra provisória de falta de [0011](0011-cancelamento-ate-2h-antes.md)

## Decisão
- Se o cliente falta, ele **perde o horário** e **a falta não conta como uso do plano**.
- A falta **gera uma sinalização para o admin** no CRM de clientes (uma aba ou marcador no cadastro do cliente, com o histórico de faltas), como insight. O admin decide fora do app o que fazer.
- Não há punição automática.

## Consequências
- Alguém (barbeiro ou admin) precisa marcar o atendimento como "falta". Sem essa marcação, o horário fica sem desfecho. Proposta: horário passado sem "realizado" ou "falta" aparece como pendente para o barbeiro.

## Revisão adversarial (2026-10-13)
- Já substituída pela 0025. A falta sem ciclo pago (0053) não restaura a regra antiga para assinante coberto. Revisada; sem alteração.
