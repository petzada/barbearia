# 0029 — Avulso pago só na barbearia; todo atendimento é confirmado pelo barbeiro ou admin

- **Data:** 2026-10-13
- **Status:** aceita (parcialmente substituída por [0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md); etapas do uso em [0058](0058-ciclo-de-vida-da-reserva-e-prazos.md))
- **Substitui:** [0028](0028-pagamento-avulso-no-app.md) (pagamento avulso pelo app)

## Contexto
A 0028 liberava pagar o avulso pelo app. No debate sobre estorno (pagar antes exige devolver dinheiro no cancelamento; pagar depois não protege contra falta), o dono do produto escolheu que o avulso seja sempre presencial, com registro no app.

## Decisão
- **O app continua sendo o hub da barbearia** (conta, agendamentos, assinatura, benefícios). Mas **serviço avulso é pago só na barbearia**, presencialmente. Não há cobrança avulsa nos gateways.
- **Todo atendimento (de plano ou avulso) é confirmado pelo barbeiro ou admin** numa seção de **atendimentos**, com um desfecho:
  - **realizado**: para itens avulsos, o barbeiro ou admin registra o pagamento e a forma (ex.: dinheiro, Pix, débito, crédito na maquininha), que pode ficar **pendente, parcial ou quitado** ([0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md));
  - **falta**: o cliente não apareceu e não cancelou pelo app.
- A **confirmação dispara o fluxo do app**: registra o desfecho do uso já reservado ou comprometido ([0058](0058-ciclo-de-vida-da-reserva-e-prazos.md)), gera a comissão ([0023](0023-comissao-por-barbeiro-e-servico.md)) e registra a receita avulsa **efetivamente recebida** ([0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md)).
- **Falta do cliente avulso não tem custo.** Falta do assinante consome uso e sinaliza o admin (0025).

## Consequências
- Gateways só para assinatura: Mercado Pago (cartão recorrente) e Woovi (Pix Automático). Volta a valer o escopo de pagamento de [0013](0013-sem-avulso-assinatura-para-clientes-escolhidos.md).
- Lista de "atendimentos pendentes de confirmação" para o barbeiro e o admin (horários passados sem desfecho).
- As finanças da barbearia no painel do admin juntam assinaturas (gateways) e avulsos (registrados no balcão, por forma de pagamento).

## Revisão adversarial (2026-10-13)
- Avulso presencial mantido. Realizado e pagamento separados, correções só pelo admin ([0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md)); etapas do uso ([0058](0058-ciclo-de-vida-da-reserva-e-prazos.md)); financeiro separado ([0068](0068-financeiro-separado-sem-lucro.md)); falta sem ciclo pago ([0053](0053-inadimplencia-revisada-reservas-mantidas.md)).
