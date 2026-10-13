# 0072 — Exclusão de conta concluída no fim do ciclo pago (ou do crédito de reposição)

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q10 e Q23
- **Substitui:** em [0046](0046-lgpd-aceite-opt-out-e-exclusao.md), "cancela a assinatura ativa e anonimiza os dados" de forma imediata

## Contexto
Anonimizar na hora impediria o cliente de usar benefícios que ele já pagou.

## Decisão
- **Uma regra só:** ao pedir a exclusão, a **renovação é interrompida na hora** ([0021](0021-cliente-cancela-assinatura-sozinho.md), [0055](0055-pedido-de-cancelamento-com-protocolo.md)). A conta continua disponível **até o fim do ciclo pago** e, se houver, **até o uso ou o vencimento do crédito de reposição** ([0059](0059-credito-de-reposicao.md)). Só então a exclusão é concluída.
- A conclusão também **aguarda devoluções e pendências** que dependem da identificação do cliente.
- O app **informa a data prevista** de encerramento no momento do pedido e atualiza essa data se surgir crédito.
- **Não** existe opção de encerramento imediato.

## Consequências
- A exclusão cobre **todos os lugares** com dado pessoal, inclusive arquivos no R2 ([0007](0007-storage-cloudflare-r2.md)), e não só a tabela de clientes. Registros financeiros e de comissão ficam sem identificação ([0046](0046-lgpd-aceite-opt-out-e-exclusao.md)).
