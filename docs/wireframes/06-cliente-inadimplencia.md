# 06 — Inadimplência

Renovação recusada não é carência e não é cancelamento voluntário.

No cancelamento voluntário, o ciclo já pago continua até a data ([05](05-cliente-planos.md)). Aqui o benefício para na hora ([0018](../decisoes/0018-inadimplencia-suspende-e-reativa.md)):

- cartão: na primeira recusa, mesmo com o Mercado Pago ainda retentando;
- Pix: se não houver pagamento até o fim do dia do vencimento. Durante o dia, o banco tenta de novo entre 18h e 21h, e o plano segue ativo até esse resultado.

As retentativas ficam ligadas. Cartão: as do Mercado Pago. Pix: as opcionais depois do vencimento, até 3 datas em 7 dias. Se uma delas, ou um pagamento manual, for aprovada, plano e benefício voltam sozinhos. Se todas acabarem sem aprovação, a assinatura é cancelada no app e no gateway. Não esperamos as 3 parcelas recusadas que o Mercado Pago usaria para cancelar por conta própria.

No exemplo, hoje é terça, 20 out, dia da cobrança, e ela não entrou. Qui 15 out ficou no ciclo que já estava pago. Qui 22 out é horário do ciclo novo.

Boulevard deixa o membro "past due", avisa a loja e o cliente, e retenta. O desenho copia o estado visível. Não copia a cadência deles: a cadência é a do gateway da decisão.

---

## S1 — Ainda é o dia do Pix

Antes do fim do dia, o início não muda para suspenso. Uma linha discreta basta:

```
+----------------------------------+
|  Pix de hoje ainda não entrou.   |
|  Seu plano segue até o fim do dia|
|                                  |
+----------------------------------+
```

Sem botão de pânico e sem cancelar horário.

---

## S2 — Suspensa

Cartão recusado, ou Pix vencido sem pagamento.

```
+----------------------------------+
| Olá, Carlos                      |
|                                  |
|  ! Assinatura suspensa           |
|  O pagamento não entrou.         |
|  [ Regularizar ]                 |
|                                  |
|  Próximo                         |
|  Qui 22 out · 15:00              |
|  guardado até qui 13:00          |
|  se o pagamento não entrar,      |
|  este horário é cancelado        |
|                                  |
| Início  Horários  Plano  Eu      |
+----------------------------------+
```

A aba Plano no lugar de P6:

```
+----------------------------------+
| Plano                            |
|                                  |
|  PREMIUM · suspensa              |
|  benefício parado                |
|                                  |
|  Horários já marcados ficam      |
|  até 2 horas antes.              |
|                                  |
|  O banco e o cartão podem        |
|  tentar de novo sozinhos.        |
|  Se passar, o plano volta.       |
|                                  |
|  [ Regularizar ]                 |
|                                  |
+----------------------------------+
```

Não há uso novo de plano enquanto estiver suspensa: a revisão de um horário coberto recusa, com esta frase. Visita que já seria avulsa (dia ou serviço fora) continua possível, porque não depende do benefício.

O WhatsApp correspondente está em [10](10-mensagens-whatsapp.md).

---

## S3 — Regularizar

```
+----------------------------------+
| <  Regularizar                   |
|                                  |
|  PREMIUM · R$ 199,90             |
|  ciclo que não entrou            |
|                                  |
|  Última tentativa                |
|  cartão · recusada               |
|                                  |
|  [ Pagar com cartão ]            |
|  [ Pagar com Pix ]               |
|                                  |
|  Se uma retentativa automática   |
|  passar antes, esta tela fecha   |
|  e o plano volta sozinho.        |
|                                  |
+----------------------------------+
```

`Pagar com cartão` abre o campo seguro do Mercado Pago, como P4, para esta parcela. `Pagar com Pix` gera a cobrança desta parcela (não uma autorização nova de recorrência, se a recorrência já existe). Os dois são o "pagamento manual" da decisão. O desenho fino do objeto da Woovi fica na integração; a pessoa vê um QR desta parcela e um estado de espera igual ao P5.

Aprovado:

```
+----------------------------------+
|  Pagamento confirmado            |
|  Seu PREMIUM voltou.             |
|  Os horários guardados           |
|  continuam marcados.             |
|                                  |
|  [ Ir ao início ]                |
|                                  |
+----------------------------------+
```

---

## S4 — Horário que já estava a menos de 2 horas

Outro caso, no mesmo 20 out: a suspensão chegou com um corte às 15:00 e agora são 14:00. Esse horário **não** é cancelado pelo job.

No cliente:

```
+----------------------------------+
|  Hoje · 15:00 · Moura            |
|  Corte                           |
|                                  |
|  Assinatura suspensa.            |
|  Este horário não foi cancelado. |
|                                  |
|  Se o pagamento não entrar       |
|  até as 15:00, o corte é feito   |
|  como avulso, pago na barbearia. |
|                                  |
|  [ Regularizar ]                 |
|                                  |
+----------------------------------+
```

No barbeiro, o mesmo horário ganha o selo `assinatura suspensa` ([07](07-barbeiro.md)). Se no momento de fechar o atendimento o plano ainda estiver suspenso, os itens que eram cobertos são registrados como avulsos, pagos na casa.

A decisão não diz se o uso que já estava reservado volta ou se consome. A tela não promete nem uma coisa nem a outra. Ela só mostra o que foi fechado: não cancela sozinho, o barbeiro vê o selo, e sem pagamento o atendimento é avulso.

---

## S5 — O job cancela o horário

Para cada horário de assinante suspenso, 2 horas antes, se continuar pendente, o horário cai e os dois lados são avisados.

Cliente, no lugar do horário:

```
+----------------------------------+
|  Qui 22 out · 15:00              |
|  cancelado                       |
|                                  |
|  O PREMIUM seguia sem pagamento. |
|  Quando o plano voltar,          |
|  marque de novo.                 |
|                                  |
+----------------------------------+
```

O horário não ressuscita se o pagamento entrar depois. A vaga já abriu.

---

## S6 — Retentativas acabaram

```
+----------------------------------+
| Plano                            |
|                                  |
|  PREMIUM · cancelada             |
|                                  |
|  As tentativas de cobrança       |
|  acabaram sem pagamento.         |
|  O cancelamento também foi       |
|  feito no cartão (ou no banco).  |
|                                  |
|  [ Ver planos ]                  |
|                                  |
+----------------------------------+
```

Diferente de P8: não resta benefício até uma data. Assinar de novo é uma assinatura nova, em P2, não um "retomar".

O admin vê o mesmo estado na ficha do cliente, sem um botão de "perdoar mensalidade". Perdão não está na decisão.
