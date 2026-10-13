# 0021 — Cliente cancela a assinatura sozinho pelo app

- **Data:** 2026-10-13 (atualizada no mesmo dia: benefício até o fim do ciclo)
- **Status:** aceita (detalhada por [0055](0055-pedido-de-cancelamento-com-protocolo.md), [0061](0061-teto-de-assinaturas-por-plano.md) e [0072](0072-exclusao-de-conta-no-fim-do-periodo.md))

## Contexto
A principal reclamação contra concorrentes é o cliente não conseguir cancelar e continuar sendo cobrado, com barbearia e plataforma empurrando a culpa uma para a outra (`docs/pesquisas/20-objecoes.md`).

## Decisão
- O cliente **cancela a assinatura sozinho, pelo app**, sem pedir ao admin.
- O cancelamento tem **efeito no gateway** (cancela a assinatura no Mercado Pago ou a autorização na Woovi) e só é confirmado ao cliente depois que o gateway confirma.
- **O benefício vale até o fim do ciclo já pago.** O cancelamento interrompe a próxima cobrança na hora, e os usos restantes continuam válidos até a data em que haveria a renovação.
- **Horários de plano marcados para depois do fim do ciclo** são cancelados na hora do cancelamento, com aviso. O cliente pode optar por mantê-los como **avulso, pago na barbearia** ([0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md)).

## Consequências
- Se o cliente cancelar pelo app do Mercado Pago ou do banco (Pix Automático), o webhook precisa refletir o cancelamento no app.
- A assinatura no app ganha o estado `cancelada_no_fim_do_ciclo` (sem renovação, benefício ativo) antes de virar `cancelada`.

## Revisão adversarial (2026-10-13)
- Autocancelamento mantido. Pedido com protocolo e devolução de cobrança de ciclo iniciado depois do pedido ([0055](0055-pedido-de-cancelamento-com-protocolo.md)); vaga ocupada até o fim do ciclo ([0061](0061-teto-de-assinaturas-por-plano.md)); exclusão de conta ([0072](0072-exclusao-de-conta-no-fim-do-periodo.md)).
