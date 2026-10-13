# 0042 — Reajuste de plano vale para todos, com 30 dias de aviso

- **Data:** 2026-10-13
- **Status:** aceita (recorrência em [0056](0056-troca-de-recorrencia-programada.md); benefícios versionados em [0062](0062-versoes-de-plano.md))

## Contexto
No cartão, o Mercado Pago passa a cobrar o novo valor sem ação do cliente. No Pix Automático, o valor novo exige nova autorização. Reajuste sem aviso aparece na pesquisa como causa de reclamação (`docs/pesquisas/20-objecoes.md`).

## Decisão
- Reajuste de preço de um plano **vale para todos os assinantes**, não só para os novos.
- O reajuste só se aplica na **primeira renovação que cair pelo menos 30 dias depois do aviso**.
- Aviso por **WhatsApp e no app**, com o valor antigo, o novo, a data a partir da qual vale e um botão de **cancelar**.
- **Cartão:** o app altera o valor no Mercado Pago na data correta.
- **Pix:** o cliente precisa **reautorizar** a recorrência com o valor novo. Quem não reautorizar tem a assinatura **cancelada no fim do ciclo** (confirmado em [0050](0050-pix-sem-nova-autorizacao.md)).

## Consequências
- Substitui a nota de [0022](0022-planos-barbearia-do-moura.md) de que mudar o preço exige nova autorização: o fluxo agora está definido aqui.

## Revisão adversarial (2026-10-13)
- Regra de 30 dias mantida para preço. Mudança de benefícios é versão de plano, com aceite ([0062](0062-versoes-de-plano.md)); recorrência programada ([0056](0056-troca-de-recorrencia-programada.md)).
