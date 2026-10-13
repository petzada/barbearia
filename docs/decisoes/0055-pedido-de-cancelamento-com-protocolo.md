# 0055 — Pedido de cancelamento registrado com protocolo, mesmo com o provedor fora do ar

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q09
- **Detalha:** [0021](0021-cliente-cancela-assinatura-sozinho.md)

## Contexto
A 0021 só confirma o cancelamento depois que o gateway confirma. Se o provedor estiver fora do ar, o cancelamento atrasa e uma nova cobrança pode acontecer depois de o cliente já ter pedido para cancelar.

## Decisão
- O app **registra na hora** a data, a hora e um **protocolo** do pedido de cancelamento.
- O cliente vê a **solicitação como pendente**, sem anúncio falso de cancelamento concluído.
- O app **tenta até obter a confirmação** do provedor. Falhas persistentes viram **pendência para o admin**.
- Vale o **instante do pedido**: cobrança de renovação de um ciclo que começou **depois** do pedido é **devolvida**. O ciclo já pago mantém os benefícios até o fim.

## Consequências
- O pedido entra como ação pendente no job de integração (pg-boss, [0016](0016-fila-de-jobs-pg-boss.md)), com retentativas e escalonamento para o admin.
