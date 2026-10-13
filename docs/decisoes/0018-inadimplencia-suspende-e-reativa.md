# 0018 — Inadimplência: suspende na hora, reativa sozinho

- **Data:** 2026-10-13
- **Status:** parcialmente substituída por [0053](0053-inadimplencia-revisada-reservas-mantidas.md); detalhada por [0052](0052-quitacao-unica-e-regularizacao-tardia.md) e [0054](0054-pagamento-revertido-ou-contestado.md)

## Contexto
A regra inicial do dono era: pagamento recusado na renovação → benefício acaba na hora, sem carência, e os horários marcados são cancelados com aviso. No review apareceram dois conflitos:
- **Mercado Pago (cartão):** recusa não é definitiva. A parcela entra em retentativa automática (até 4 tentativas em 10 dias), e a assinatura só é cancelada pelo Mercado Pago depois de 3 parcelas recusadas (`docs/pesquisas/22-mercado-pago-recorrente.md`). Cancelar horários na primeira recusa faria o cliente perder horários e pagar logo depois.
- **Pix Automático:** sem saldo, o banco do pagador tenta de novo no mesmo dia, entre 18h e 21h. O resultado só é definitivo no fim do dia do vencimento.

## Decisão
- ~~Sem carência: na primeira recusa do cartão, o benefício é suspenso na hora.~~ → sem carência, mas o benefício só é suspenso quando o **período pago termina** sem novo pagamento aprovado ([0053](0053-inadimplencia-revisada-reservas-mantidas.md)).
- O cliente recebe **aviso no WhatsApp** e vê no app um botão **"regularizar"**.
- ~~Horários já marcados ficam reservados até 2 horas antes e são cancelados automaticamente.~~ → horários **mantidos**; o cliente escolhe regularizar, manter como avulso com aceite ou cancelar sem penalidade ([0053](0053-inadimplencia-revisada-reservas-mantidas.md)).
- Se uma **retentativa do gateway** ou um **pagamento manual** for aprovado, a assinatura e o benefício **voltam sozinhos**.
- As **retentativas do próprio gateway ficam ativas**: as do cartão no Mercado Pago e as opcionais do Pix Automático depois do vencimento (até 3 datas em 7 dias).
- ~~Horário a menos de 2h da suspensão: mantido e feito como avulso se não regularizar.~~ → absorvido pela regra geral da [0053](0053-inadimplencia-revisada-reservas-mantidas.md): o avulso só acontece com aceite.
- **Se as retentativas acabarem sem aprovação, a assinatura é cancelada** no app e no gateway, com aviso ao cliente. Não esperamos as 3 parcelas recusadas que o Mercado Pago aguardaria para cancelar sozinho.

## Consequências
- A assinatura no nosso banco tem estado próprio, independente do gateway: `ativa`, `suspensa` (pagamento pendente), `cancelada_no_fim_do_ciclo` ([0021](0021-cliente-cancela-assinatura-sozinho.md)) e `cancelada`. Ela é atualizada por webhook e confirmada por consulta à API.
- Enquanto a assinatura está `suspensa`, o cliente não marca novos horários pelo plano; pode marcar como avulso ([0027](0027-cobertura-do-plano-e-parte-avulsa.md)).
- ~~Precisa de um job que cancela 2 horas antes os horários de assinante suspenso.~~ → removido: não há cancelamento automático por inadimplência ([0053](0053-inadimplencia-revisada-reservas-mantidas.md)).

## Revisão adversarial (2026-10-13)
- Revisão central: suspensão só depois do período pago e horários mantidos com escolha do cliente ([0053](0053-inadimplencia-revisada-reservas-mantidas.md)); uma quitação por ciclo e regularização tardia iniciando novo ciclo ([0052](0052-quitacao-unica-e-regularizacao-tardia.md)); reversão de pagamento ([0054](0054-pagamento-revertido-ou-contestado.md)); vagas no teto ([0061](0061-teto-de-assinaturas-por-plano.md)).
