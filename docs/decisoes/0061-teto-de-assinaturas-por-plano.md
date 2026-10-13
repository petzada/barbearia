# 0061 — Teto opcional de assinaturas por plano

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q13, Q14, Q48 e Q49
- **Detalha:** [0020](0020-cadastro-aberto-admin-gerencia-no-backoffice.md), [0022](0022-planos-barbearia-do-moura.md)

## Contexto
O limite individual de reservas não limita o total de assinantes nem garante capacidade de atendimento.

## Decisão
- O admin configura um **teto opcional de assinaturas por plano**. Atingido o teto, **novas contratações ficam indisponíveis** até o admin aumentar o limite ou surgir vaga.
- **Ocupam vaga:** assinaturas ativas; **suspensas** enquanto as retentativas podem reativá-las; **canceladas** até o fim do ciclo pago. A vaga é liberada no **encerramento efetivo** da assinatura.
- **Reduzir o teto** abaixo do total existente preserva as assinaturas atuais e bloqueia novas contratações até haver vaga.
- **Reserva temporária de vaga:** ao iniciar o pagamento, o cliente segura a vaga por um **prazo informado na tela**, liberado automaticamente se ele não concluir.
  - Aprovação depois do prazo → nova conferência de capacidade; havendo vaga, ativa.
  - Se a vaga foi preenchida **no intervalo concorrente** e o pagamento foi aprovado → ativa **excepcionalmente além do teto**. A exceção vale **só nesse caso**. O excedente conta na ocupação e bloqueia novas contratações até surgir capacidade.
- O teto **pertence ao plano** e conta as assinaturas de **todas as versões** dele juntas ([0062](0062-versoes-de-plano.md)).

## Consequências
- O cadastro aberto da 0020 passa a ser sujeito ao teto, quando o admin o configurar.
- Prazo da reserva temporária de vaga: **30 minutos** ([0081](0081-valores-padrao-de-limites-e-seguranca.md)).
