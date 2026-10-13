# 0063 — Notificação não é aceite: cobrança avulsa, troca de plano, migração e troca de barbeiro exigem concordância

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q04, Q17, Q18 e Q51
- **Substitui:** em [0039](0039-troca-de-plano-no-proximo-ciclo.md) e [0050](0050-pix-sem-nova-autorizacao.md), "horários afetados viram avulso, e o cliente é avisado"; em [0032](0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md), "transferência feita pelo admin também avisa o cliente"

## Contexto
Várias decisões trocavam a cobertura de um horário ou o barbeiro só com um aviso. Aviso não é concordância, ainda mais perto do atendimento.

## Decisão
- **Enviar notificação nunca equivale a aceite.**
- **Troca de plano** (pelo cliente ou pelo admin): **antes de confirmar**, o app mostra os **horários afetados e os preços**. O cliente escolhe **manter como avulso** (com aceite) ou **cancelar sem penalidade**. Se a cobertura mudar depois (ex.: troca não efetivada no Pix, [0050](0050-pix-sem-nova-autorizacao.md)), o app **pede a escolha de novo**.
- **Migração de versão de plano** ([0062](0062-versoes-de-plano.md)) só acontece com **aceite** do assinante.
- **Horário que perde cobertura por inadimplência** segue as três opções da [0053](0053-inadimplencia-revisada-reservas-mantidas.md).
- **Transferência de barbeiro pela barbearia** exige **concordância do cliente**, que a equipe pode registrar quando ela vier pelo balcão ou por outro canal. **Recusa** permite **cancelar sem penalidade**, tratado como cancelamento pela barbearia, com **crédito de reposição** quando houver benefício pago ([0059](0059-credito-de-reposicao.md)).

## Consequências
- Sem resposta do cliente, o horário fica mantido e vale a mesma regra da 0053: a equipe confirma o preço e obtém a concordância no balcão antes do serviço.
- Cada aceite fica registrado com data, hora, canal e quem registrou (cliente pelo app ou equipe).
