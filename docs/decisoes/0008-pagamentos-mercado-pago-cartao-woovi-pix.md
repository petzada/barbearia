# 0008 — Pagamentos: Mercado Pago para cartão, Woovi para Pix Automático

- **Data:** 2026-10-13
- **Status:** aceita (contas por fase em [0030](0030-contas-dos-provedores-de-pagamento-por-fase.md); usado só para assinaturas, ver [0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md))
- **Detalha:** [0004](0004-assinatura-recorrente-cartao-e-pix.md)

## Contexto
O dono da Barbearia do Moura já usa Mercado Pago e prefere manter. A pesquisa (`docs/pesquisas/22-mercado-pago-recorrente.md`) não achou, em 13/10/2026, documentação do Mercado Pago para um vendedor comum criar recorrência Pix Automático pela API. A API de Assinaturas documenta débito automático só para cartão.

## Decisão
- **Cartão de crédito recorrente:** Mercado Pago (API de Assinaturas, `preapproval`). Titular da conta: ver [0030](0030-contas-dos-provedores-de-pagamento-por-fase.md).
- **Pix recorrente (Pix Automático):** Woovi.
- ~~**Uma conta só** em cada gateway, ambas do dono.~~ → titularidade das contas definida em [0030](0030-contas-dos-provedores-de-pagamento-por-fase.md). **Sem split** para os barbeiros (a subconta Woovi da barbearia, de 0030, não é repasse a barbeiro).

## Consequências
- Duas integrações de pagamento: dois conjuntos de webhooks, duas conciliações e dois painéis para o dono. O código de assinatura precisa de uma camada própria (status do clube no nosso banco) que não dependa de um gateway específico.
- **Pré-requisitos verificados (13/10/2026, pelo dono do produto):** a Barbearia do Moura tem CNPJ ativo, e a Woovi tem Pix Automático disponível na API.
- Cartão nunca passa pelo nosso servidor: tokenização pelo campo seguro do Mercado Pago.
- O cliente cancela a assinatura sozinho, pelo app, com efeito no gateway: confirmado em [0021](0021-cliente-cancela-assinatura-sozinho.md).

## Revisão adversarial (2026-10-13)
- Provedores mantidos. Cobrança duplicada do mesmo ciclo é devolvida ([0052](0052-quitacao-unica-e-regularizacao-tardia.md)); reversão e contestação em [0054](0054-pagamento-revertido-ou-contestado.md); troca de recorrência em [0056](0056-troca-de-recorrencia-programada.md); mudança de conta em [0057](0057-mudanca-de-conta-exige-migracao.md).
