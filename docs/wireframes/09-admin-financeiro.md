# 09 — Financeiro, comissão e repasse

O sistema calcula. Não transfere. O admin paga o barbeiro por fora e marca como pago ([0009](../decisoes/0009-repasse-manual-aos-barbeiros.md)). Não há split no Mercado Pago nem na Woovi ([0008](../decisoes/0008-pagamentos-mercado-pago-cartao-woovi-pix.md)).

A receita da casa junta duas origens ([0029](../decisoes/0029-avulso-presencial-e-confirmacao-de-atendimento.md)):

- assinatura, que entrou pelo gateway;
- avulso, que o barbeiro ou o admin registrou ao fechar o atendimento, com a forma do balcão.

A comissão é um percentual por barbeiro e por serviço, com um percentual para avulso e outro para assinante, os dois sobre o valor cheio ([0023](../decisoes/0023-comissao-por-barbeiro-e-servico.md)). O padrão do percentual de assinante é igual ao de avulso, até o admin separar. O valor que o barbeiro vê em B7 é o valor que será pago. A diferença entre os dois percentuais fica nesta matriz, não num acerto de boca.

AppBarber também marca comissão como paga à mão e não liquida Pix do cliente na conta do barbeiro. A pesquisa de clube avisa que comissionar o valor cheio de todo corte, em plano barato, pode comer a mensalidade. A tela não esconde essa conta: cada linha mostra base, percentual e resultado. O percentual em si não está decidido; os campos nascem vazios, não com 50%.

Nada desta página aparece para o cliente.

---

## F1 — O mês

```
+----------------------------------+
| Financeiro · outubro             |
|                                  |
|  Assinaturas                     |
|  Mercado Pago    recebido R$ --  |
|                  pendente  R$ -- |
|  Woovi           recebido R$ --  |
|                  pendente  R$ -- |
|                                  |
|  Avulso no balcão                |
|  Dinheiro                 R$ --  |
|  Pix                      R$ --  |
|  Débito                   R$ --  |
|  Crédito                  R$ --  |
|                                  |
|  [ Repasses ]                    |
|  [ Comissão ]                    |
|                                  |
+----------------------------------+
```

`Pendente` em assinatura é cobrança do ciclo ainda não aprovada (inclui suspensa). Não é dinheiro que o app vá buscar. Tocar a linha abre a lista de pagamentos, a mesma que está na ficha do cliente, filtrada pelo mês.

Avulso só entra depois do `Realizado` com forma escolhida. Falta não entra.

---

## F2 — Matriz de comissão

```
+----------------------------------+
| Comissão                         |
|                                  |
|           avulso    assinante    |
|  Moura                           |
|  Corte    [  ]%     [  ]%        |
|  Barba    [  ]%     [  ]%        |
|  Combo    [  ]%     [  ]%        |
|                                  |
|  Barbeiro B                      |
|  Corte    [  ]%     [  ]%        |
|  Barba    [  ]%     [  ]%        |
|  Combo    [  ]%     [  ]%        |
|                                  |
|  Assinante começa igual          |
|  ao avulso.                      |
|                                  |
|  [ Salvar ]                      |
|                                  |
+----------------------------------+
```

Salvar não reescreve lançamento antigo. Cada atendimento realizado guarda, na hora, o valor cheio, se o item era plano ou avulso, e o percentual daquele momento.

Visita mista gera dois lançamentos, ou um lançamento com dois itens, desde que os dois percentuais apareçam separados. O wireframe prefere duas linhas, porque o repasse precisa bater com o que o barbeiro lê.

Exemplo de leitura, com números que **não** são decisão:

```
+----------------------------------+
|  Corte coberto                   |
|  valor cheio R$ 50,00            |
|  assinante 40%                   |
|  a receber R$ 20,00              |
|                                  |
|  Barba avulsa                    |
|  valor cheio R$ 35,00            |
|  avulso 50%                      |
|  a receber R$ 17,50              |
+----------------------------------+
```

R$ 50, R$ 35, 40% e 50% existem só para mostrar a conta. A tela real usa o valor cheio de G6 e os percentuais de F2.

---

## F3 — Repasse do mês

```
+----------------------------------+
| Repasses · outubro               |
|                                  |
|  Moura                           |
|  em aberto          R$ xx,xx     |
|  [ Ver lançamentos ]             |
|  [ Marcar em aberto como pago ]  |
|                                  |
|  Barbeiro B                      |
|  em aberto          R$ xx,xx     |
|  [ Ver lançamentos ]             |
|  [ Marcar em aberto como pago ]  |
|                                  |
+----------------------------------+
```

Lançamentos de um barbeiro:

```
+----------------------------------+
| <  Moura · outubro               |
|                                  |
|  13 out · Carlos · corte         |
|  plano · xx% · R$ xx,xx          |
|  em aberto                       |
|                                  |
|  13 out · Ana · barba            |
|  avulso · xx% · R$ xx,xx         |
|  em aberto                       |
|                                  |
|  2 out · ajuste                  |
|  R$ xx,xx · em aberto            |
|  "diferença combinada"           |
|                                  |
+----------------------------------+
```

`Marcar em aberto como pago` pede confirmação. Não abre banco, não gera Pix, não pede chave.

```
+----------------------------------+
|  Marcar R$ xx,xx de Moura        |
|  como pago?                      |
|                                  |
|  O pagamento é feito por fora.   |
|  Esta ação só registra           |
|  que você já pagou.              |
|                                  |
|  [ Marcar como pago ]            |
|  [ Voltar ]                      |
|                                  |
+----------------------------------+
```

As linhas em aberto viram `pago em 13 out`. O barbeiro vê a mesma mudança em B7. Não se edita uma linha paga. Estorno ou correção é um lançamento novo:

```
+----------------------------------+
|  [ Lançar ajuste ]               |
|                                  |
|  Valor   [ R$        ]           |
|  ( ) somar ao que ele recebe     |
|  ( ) abater do que ele recebe    |
|                                  |
|  Nota                            |
|  [ __________________________ ]  |
|                                  |
|  [ Lançar ]                      |
|                                  |
+----------------------------------+
```

O ajuste entra em aberto e só sai quando o admin marca o repasse, junto com o resto ou sozinho. Não existe "apagar o corte de ontem".

Fechamento é mensal: a tela é um mês por vez. Não há quinzena nem "pagar este atendimento agora" como fluxo separado. Marcar como pago atua nas linhas em aberto daquele mês. Se o admin quiser pagar só uma, a decisão não descreve pagamento parcial por linha. O desenho marca o bloco em aberto inteiro do mês, que é o fechamento mensal escrito em [0009](../decisoes/0009-repasse-manual-aos-barbeiros.md). Pagamento linha a linha fica de fora até alguém decidir.

---

## O que não tem botão

- Transferir a mensalidade do cliente para o barbeiro.
- Reter porcentagem da plataforma.
- Editar o valor de um atendimento fechado.
- Comissão de falta, de horário cancelado pela casa, ou de horário ainda não realizado.
- Conferência de taxa de maquininha. A forma (débito, crédito, Pix, dinheiro) é registro. A taxa da bandeira não entra nesta decisão.
