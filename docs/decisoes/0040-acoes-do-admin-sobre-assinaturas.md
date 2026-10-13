# 0040 — Ações do admin sobre a assinatura de um cliente

- **Data:** 2026-10-13
- **Status:** aceita (detalhada por [0060](0060-limites-de-uso-e-de-reserva.md), [0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md) e [0076](0076-central-de-notificacoes-e-gestao-no-desktop.md))
- **Detalha:** [0020](0020-cadastro-aberto-admin-gerencia-no-backoffice.md)

## Decisão
No CRM de clientes, o admin pode, no MVP:
- **Cancelar a assinatura** pelo cliente, com a mesma regra de [0021](0021-cliente-cancela-assinatura-sozinho.md): vale até o fim do ciclo pago, com efeito no gateway.
- **Devolver um uso consumido** (ex.: falta justificada) ou **conceder um uso extra** de cortesia no ciclo. Não tem efeito no gateway.
- **Agendar troca de plano**, com a regra de [0039](0039-troca-de-plano-no-proximo-ciclo.md).

**Fora do MVP:** pausar assinatura (no Pix Automático exigiria cancelar e reautorizar).

## Consequências
- Toda ação do admin fica no **histórico do cliente**, com quem fez, quando e o motivo (obrigatório).
- Uso devolvido ou concedido não gera nem estorna comissão: a comissão vem do atendimento realizado ([0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md)).

## Revisão adversarial (2026-10-13)
- Mantida. Uso extra aumenta saldo, não o limite de reservas ([0060](0060-limites-de-uso-e-de-reserva.md)); correção de atendimento ([0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md)); ações sensíveis só no desktop ([0076](0076-central-de-notificacoes-e-gestao-no-desktop.md)).
