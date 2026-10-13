# 0004 — Assinatura recorrente via cartão de crédito e Pix recorrente

- **Data:** 2026-10-13
- **Status:** aceita (detalhada por [0008](0008-pagamentos-mercado-pago-cartao-woovi-pix.md): Mercado Pago para cartão, Woovi para Pix Automático)

## Contexto
O cliente poderá assinar planos que liberam benefícios.

## Decisão
- A assinatura é **recorrente** e pode ser paga por **cartão de crédito** ou **Pix recorrente** (Pix Automático).
- O pagamento acontece **dentro do app**, sem mandar o cliente para outro sistema de gestão.
- Cada plano libera **benefícios específicos**.

## Consequências
- ~~O gateway escolhido precisa suportar Pix Automático~~ → resolvido em [0008](0008-pagamentos-mercado-pago-cartao-woovi-pix.md) com dois gateways.
- No Pix Automático, o cliente autoriza a recorrência no app do banco dele (QR Code / redirecionamento). Esse é um passo fora do nosso app, que não dá para evitar.
- Dados de cartão não devem passar pelo nosso servidor: usar tokenização ou checkout transparente do gateway.

## Revisão adversarial (2026-10-13)
- Meios de pagamento mantidos. Uma quitação por ciclo e regularização tardia em [0052](0052-quitacao-unica-e-regularizacao-tardia.md); pedido de cancelamento com protocolo em [0055](0055-pedido-de-cancelamento-com-protocolo.md); troca de recorrência programada em [0056](0056-troca-de-recorrencia-programada.md).
