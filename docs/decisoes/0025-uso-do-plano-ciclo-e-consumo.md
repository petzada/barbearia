# 0025 — Uso do plano: ciclo de cobrança, sem acúmulo, falta consome uso

- **Data:** 2026-10-13
- **Status:** aceita (detalhada por [0052](0052-quitacao-unica-e-regularizacao-tardia.md), [0058](0058-ciclo-de-vida-da-reserva-e-prazos.md) e [0059](0059-credito-de-reposicao.md))
- **Substitui:** [0024](0024-falta-nao-consome-uso-e-sinaliza-admin.md) (a falta passa a consumir uso; a sinalização ao admin continua)
- **Detalha:** [0022](0022-planos-barbearia-do-moura.md)

## Contexto
Com "4 vezes no mês" contado pelo calendário, quem assinasse no dia 25 teria 8 cortes no primeiro pagamento, e a data do Pix Automático não coincide com o dia 1. Na 0024, a falta não consumia uso. No review apareceu o risco: o assinante poderia marcar e faltar sem limite, travando horários de outros clientes. O dono do produto escolheu a regra mais rígida.

## Decisão
- **Ciclo = período entre cobranças.** Cada ciclo quitado (uma quitação por ciclo, [0052](0052-quitacao-unica-e-regularizacao-tardia.md)) libera os usos do plano (4 nos planos atuais), **válidos até a próxima cobrança**.
- **Não acumula:** uso não utilizado no ciclo expira.
- **Um uso é consumido quando:**
  1. o atendimento é marcado como **realizado**; ou
  2. o horário **não é cancelado dentro do prazo** da reserva (padrão 2 horas), por falta ou cancelamento tardio, conforme [0058](0058-ciclo-de-vida-da-reserva-e-prazos.md).
- A **falta** consome o uso **e** gera a **sinalização para o admin** no CRM do cliente, como insight.
- As regras ficam **explícitas para o cliente**: no momento de assinar, na tela do plano e na confirmação de cada agendamento.

## Consequências
- Etapas do uso: reservado ao marcar → comprometido no fim do prazo → desfecho (realizado ou falta), sem desconto duplicado ([0058](0058-ciclo-de-vida-da-reserva-e-prazos.md)).
- O cliente não pode marcar mais horários do que os usos que restam no ciclo.
- Falta **não gera comissão**: lançamento para o barbeiro só sai de atendimento realizado ([0023](0023-comissao-por-barbeiro-e-servico.md)).
- Horário passado sem desfecho ("realizado" ou "falta") aparece como pendente para o barbeiro marcar.

## Revisão adversarial (2026-10-13)
- Refinada: uma quitação por ciclo e regularização tardia ([0052](0052-quitacao-unica-e-regularizacao-tardia.md)); etapas reservado → comprometido → desfecho ([0058](0058-ciclo-de-vida-da-reserva-e-prazos.md)); crédito de reposição ([0059](0059-credito-de-reposicao.md)); uso extra não aumenta limite ([0060](0060-limites-de-uso-e-de-reserva.md)). Exceção: falta durante suspensão sem ciclo pago não consome uso ([0053](0053-inadimplencia-revisada-reservas-mantidas.md)).
