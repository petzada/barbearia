# 0034 — Barbeiro e admin marcam em nome do cliente (encaixe, balcão, WhatsApp)

- **Data:** 2026-10-13
- **Status:** aceita (mensagens ao pré-cadastrado em [0051](0051-mensagens-para-cliente-pre-cadastrado.md); identidade em [0070](0070-identificador-interno-e-troca-de-whatsapp.md); limite geral em [0060](0060-limites-de-uso-e-de-reserva.md))

## Contexto
Se só o cliente marcasse pelo app, todo atendimento de balcão ou pedido por WhatsApp e telefone ficaria fora do sistema. Comissão ([0023](0023-comissao-por-barbeiro-e-servico.md)), confirmação de atendimento ([0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md)) e financeiro ficariam incompletos.

## Decisão
- O **barbeiro** cria horários **na própria agenda**, e o **admin em qualquer agenda**, para:
  - cliente já cadastrado; ou
  - cliente novo, informando **só nome e telefone**.
- O cliente novo ganha uma **conta pré-cadastrada**, que ele **ativa ao fazer login com o mesmo telefone**. O histórico já fica lá.
- **Encaixe fora da grade de 30 minutos** é permitido **só para barbeiro e admin**.
- As regras de plano valem igual: se o cliente for assinante, o atendimento pode ser coberto pelo plano ([0027](0027-cobertura-do-plano-e-parte-avulsa.md)).

## Consequências
- O pré-cadastro fica ligado ao identificador interno da conta, e o WhatsApp verificado evita conta duplicada ([0070](0070-identificador-interno-e-troca-de-whatsapp.md)).
- ~~O cliente pré-cadastrado recebe os lembretes no WhatsApp normalmente.~~ → recebe só a confirmação e os lembretes do horário que pediu, com link para ativar a conta e opção SAIR ([0051](0051-mensagens-para-cliente-pre-cadastrado.md)).

## Revisão adversarial (2026-10-13)
- Mantida. Identidade pelo identificador interno ([0070](0070-identificador-interno-e-troca-de-whatsapp.md)); a equipe pode ultrapassar o limite geral com justificativa ([0060](0060-limites-de-uso-e-de-reserva.md)). Conta de cliente sem WhatsApp não foi aprovada.
