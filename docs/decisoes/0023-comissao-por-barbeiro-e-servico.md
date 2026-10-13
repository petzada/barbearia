# 0023 — Comissão: percentual por barbeiro e por serviço, com percentual próprio para assinante

- **Data:** 2026-10-13 (atualizada no mesmo dia: percentual de assinante)
- **Status:** aceita (detalhada por [0049](0049-combo-dividido-em-componentes.md), [0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md) e [0066](0066-valores-preservados-na-reserva.md))

## Contexto
A primeira versão calculava sempre sobre o valor cheio, e o admin pagaria menos por fora nos atendimentos de assinante. No review apareceram dois problemas: o barbeiro veria no app um valor e receberia outro, e o sistema guardaria um "valor a receber" que não foi pago, o que pode virar prova numa discussão trabalhista.

## Decisão
- O admin cadastra o **valor cheio de cada serviço** (ex.: corte, barba, corte + barba).
- Na matriz **barbeiro × serviço**, o admin define **dois percentuais**:
  - **% avulso:** atendimento de cliente sem plano;
  - **% assinante:** atendimento coberto por plano. Por padrão é igual ao % avulso.
- Todo atendimento realizado gera um lançamento para o barbeiro: **percentual aplicável × valor cheio do serviço**.
- O valor calculado pelo app é o valor que o admin paga. A diferença entre assinante e avulso fica **dentro do app, configurada**, e não é mais acertada por fora.

## Consequências
- Cada lançamento guarda o valor do serviço **preservado na reserva** ([0066](0066-valores-preservados-na-reserva.md)), o tipo (plano ou avulso) e o percentual **vigente na data do atendimento**. Mudar o percentual não altera atendimentos passados.
- Ver [0009](0009-repasse-manual-aos-barbeiros.md): o admin paga por fora e marca como pago.
- A mesma matriz também define quais serviços cada barbeiro faz ([0037](0037-plano-vale-com-qualquer-barbeiro-e-habilitacao-por-servico.md)).
- Combo com só parte coberta: comissão por componente ([0049](0049-combo-dividido-em-componentes.md)).

## Revisão adversarial (2026-10-13)
- Fórmula mantida sob controle do admin. Realizado gera comissão mesmo com avulso pendente ([0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md)); valores preservados na reserva ([0066](0066-valores-preservados-na-reserva.md)); reversão de pagamento não retira comissão automaticamente ([0054](0054-pagamento-revertido-ou-contestado.md)). Simulador de margem rejeitado (Q12).
