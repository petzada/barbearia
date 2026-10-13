# 05 — Planos e assinatura

Qualquer cliente autenticado assina. Não há habilitação prévia ([0020](../decisoes/0020-cadastro-aberto-admin-gerencia-no-backoffice.md)). A cobrança é recorrente, dentro do app, no cartão pelo Mercado Pago ou no Pix Automático pela Woovi ([0004](../decisoes/0004-assinatura-recorrente-cartao-e-pix.md), [0008](../decisoes/0008-pagamentos-mercado-pago-cartao-woovi-pix.md)). O Pix sai para o app do banco; esse passo não tem como ficar aqui.

Os três planos são os da casa hoje ([0022](../decisoes/0022-planos-barbearia-do-moura.md)). O admin pode mudar nome, serviços, dias, usos e preço ([08](08-admin-casa.md)); a vitrine lê esses dados, não um cartaz fixo no código.

A primeira leitura diz a cota. ShavingPass publica "não acumula" na oferta. A BARBR publica quantos horários futuros o plano segura. O review do Wilker Castro (AppBarber, set/2026) reclama de "quando quiser" com um dia só de agenda. Aqui os números ficam no cartão.

Ciclo é o intervalo entre cobranças, não o mês de calendário ([0025](../decisoes/0025-uso-do-plano-ciclo-e-consumo.md)). No exemplo das telas, a cobrança foi em 20 set e a próxima é 20 out: os usos valem até 20 out, não "até o dia 30".

---

## P1 — Vitrine

```
+----------------------------------+
| Planos                           |
|                                  |
|  +----------------------------+  |
|  | BLACK            R$ 129,90 |  |
|  | Corte                      |  |
|  | qualquer dia               |  |
|  | 4 usos por ciclo           |  |
|  | não acumula                |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | GOLD LIMITADO    R$ 179,90 |  |
|  | Corte e barba              |  |
|  | só terça e quarta          |  |
|  | 4 usos por ciclo           |  |
|  | não acumula                |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | PREMIUM          R$ 199,90 |  |
|  | Corte e barba              |  |
|  | qualquer dia               |  |
|  | 4 usos por ciclo           |  |
|  | não acumula                |  |
|  +----------------------------+  |
|                                  |
| Início  Horários  Plano  Eu      |
+----------------------------------+
```

Fora de terça e quarta, GOLD ainda marca, como avulso. Barba no BLACK também. Isso não está no cartão pequeno; está no detalhe, para não parecer que o dia errado está proibido.

---

## P2 — Detalhe, antes de pagar

PREMIUM como exemplo. BLACK e GOLD repetem o mesmo bloco com a cobertura e os dias deles.

```
+----------------------------------+
| <  PREMIUM                       |
|    R$ 199,90 por ciclo           |
|                                  |
|  4 usos entre uma cobrança       |
|  e a próxima. Não acumulam.      |
|                                  |
|  1 visita coberta = 1 uso,       |
|  corte, barba ou os dois.        |
|                                  |
|  Até 4 horários de plano         |
|  ao mesmo tempo.                 |
|  Até 30 dias à frente.           |
|                                  |
|  Cancelar o horário até 2h       |
|  antes devolve o uso.           |
|  Não cancelar, ou não vir,       |
|  consome o uso.                  |
|                                  |
|  Você cancela a assinatura       |
|  neste app, quando quiser.       |
|  O que já foi pago vale até      |
|  o fim do ciclo.                 |
|                                  |
|  [ Continuar ]                   |
|                                  |
+----------------------------------+
```

GOLD acrescenta: "Terça e quarta entram no plano. Nos outros dias a visita é paga na barbearia e não gasta uso."

BLACK acrescenta: "Barba é paga na barbearia e não gasta uso. O corte no mesmo horário continua 1 uso."

Não há fidelidade de 3 ou 12 meses. Não há adesão. Não há "sem fila".

---

## P3 — Como pagar

```
+----------------------------------+
| <  Pagamento                     |
|    PREMIUM · R$ 199,90           |
|    a cada ciclo                  |
|                                  |
|  ( ) Cartão de crédito           |
|      cobrança automática         |
|                                  |
|  ( ) Pix Automático              |
|      você autoriza no banco      |
|                                  |
|  [x] Li as regras de uso,        |
|      de falta e de cancelamento  |
|                                  |
|  [ Continuar ]                   |
|                                  |
+----------------------------------+
```

O checkbox é obrigatório. Sem ele o botão não segue. As regras são as da P2, não um contrato em outra página escondida.

---

## P4 — Cartão

O número não passa pelo nosso servidor. O retângulo é o campo seguro do Mercado Pago ([0004](../decisoes/0004-assinatura-recorrente-cartao-e-pix.md), [0008](../decisoes/0008-pagamentos-mercado-pago-cartao-woovi-pix.md)).

```
+----------------------------------+
| <  Cartão                        |
|                                  |
|  +----------------------------+  |
|  | campo seguro Mercado Pago  |  |
|  | número, validade, CVV, nome|  |
|  +----------------------------+  |
|                                  |
|  A primeira cobrança é agora.    |
|  A próxima, daqui a um ciclo,    |
|  no mesmo cartão.                |
|                                  |
|  Na fatura, Barbearia do Moura.  |
|                                  |
|  [ Assinar PREMIUM ]             |
|                                  |
+----------------------------------+
```

Enquanto o Mercado Pago não aprova, o botão vira "Confirmando..." e não dá para apertar de novo. Recusa fica nesta tela: "O cartão não passou. Tente outro ou pague com Pix." O plano não fica meio-ativo.

Aprovou: P6.

---

## P5 — Pix Automático

```
+----------------------------------+
| <  Pix Automático                |
|                                  |
|  R$ 199,90 agora, e de novo      |
|  a cada ciclo, no seu banco.     |
|                                  |
|  +----------------------------+  |
|  |         QR Code            |  |
|  +----------------------------+  |
|                                  |
|  [ Abrir o app do banco ]        |
|                                  |
|  Aguardando você autorizar.      |
|                                  |
+----------------------------------+
```

`Abrir o app do banco` é o redirecionamento que a decisão já aceita como passo fora do app. A pessoa volta para esta mesma tela.

```
+----------------------------------+
|  Autorização recebida            |
|                                  |
|  Quando o pagamento deste        |
|  ciclo for confirmado,           |
|  o PREMIUM libera os 4 usos.     |
|                                  |
|  Você pode fechar.               |
|  O plano aparece aqui sozinho.   |
|                                  |
|  [ Voltar ao início ]            |
|                                  |
+----------------------------------+
```

Se ela abandona antes de autorizar, não existe assinatura. A vitrine continua em P1. Não mandamos lembrete de "você esqueceu de assinar": isso seria disparo que ninguém pediu.

Mudar o preço depois exige nova autorização de quem paga no Pix. Essa frase está na configuração do admin, não aqui.

---

## P6 — Plano ativo

```
+----------------------------------+
| Plano                            |
|                                  |
|  PREMIUM · ativa                 |
|  R$ 199,90 no cartão             |
|                                  |
|  Restam 2 de 4                    |
|  até 20 out                      |
|  não acumula                     |
|                                  |
|  Próxima cobrança · 20 out       |
|                                  |
|  Até 4 horários de plano         |
|  até 30 dias à frente           |
|                                  |
|  [ Ver regras ]                  |
|  [ Cancelar assinatura ]         |
|                                  |
| Início  Horários  Plano  Eu      |
+----------------------------------+
```

`Ver regras` reabre o texto de P2. Estados possíveis nesta aba:

| Estado | O que a pessoa lê |
| --- | --- |
| `ativa` | P6 |
| `suspensa` | benefício parado, botão Regularizar. Arquivo [06](06-cliente-inadimplencia.md) |
| `cancelada no fim do ciclo` | P8. Sem renovação, usos até a data |
| `cancelada` | Volta a P1, com uma linha do que acabou |

---

## P7 — Cancelar a assinatura

O cliente faz sozinho. O efeito tem de chegar no Mercado Pago ou na Woovi. A tela só diz "cancelada" depois que o gateway confirma ([0021](../decisoes/0021-cliente-cancela-assinatura-sozinho.md)). É a resposta direta às reclamações em que a plataforma manda o cliente falar com a barbearia e a barbearia não acha a cobrança. O comprovante na hora, que a AppBarber passou a mostrar na versão 6.1.0, fica nesta última tela.

Passo 1, o que continua valendo:

```
+----------------------------------+
| <  Cancelar assinatura           |
|                                  |
|  A próxima cobrança para         |
|  quando o pagamento confirmar    |
|  o cancelamento.                 |
|                                  |
|  O PREMIUM segue até 20 out.     |
|  Usos que restam valem até lá.   |
|  Não devolvemos o ciclo já pago. |
|                                  |
|  [ Continuar ]                   |
|  [ Manter assinatura ]           |
|                                  |
+----------------------------------+
```

Passo 2, só se existir horário de plano **depois** de 20 out:

```
+----------------------------------+
|  Depois de 20 out                |
|                                  |
|  Qui 22 out · 11:00 · Moura      |
|  Corte                           |
|                                  |
|  ( ) Cancelar este horário       |
|      o uso reservado se desfaz   |
|  ( ) Manter e pagar na barbearia |
|      deixa de ser uso de plano   |
|                                  |
|  [ Continuar ]                   |
|                                  |
+----------------------------------+
```

Um horário por bloco, se houver mais de um. O padrão marcado ao abrir é "Cancelar este horário": a decisão manda cancelar na hora, e a pessoa opta por manter como avulso.

Passo 3, espera do gateway:

```
+----------------------------------+
|                                  |
|  Confirmando com o               |
|  Mercado Pago...                 |
|                                  |
|  Não feche. O cancelamento       |
|  só vale quando eles aceitarem.  |
|                                  |
+----------------------------------+
```

No Pix, a frase troca para "Confirmando com o seu banco...".

Falhou a confirmação:

```
+----------------------------------+
|  Não foi possível cancelar agora |
|                                  |
|  A cobrança continua.            |
|  Tente de novo em alguns minutos.|
|                                  |
|  [ Tentar de novo ]              |
|                                  |
+----------------------------------+
```

A assinatura segue `ativa`. Não mostramos comprovante.

Passo 4, comprovante:

```
+----------------------------------+
|  Assinatura cancelada            |
|                                  |
|  PREMIUM vale até 20 out.        |
|  Não haverá cobrança em 20 out.  |
|                                  |
|  Qui 22 out foi cancelado.       |
|                                  |
|  Guarde esta tela.               |
|  O aviso também vai ao WhatsApp  |
|  se você aceitou avisos.         |
|                                  |
|  [ Concluir ]                    |
|                                  |
+----------------------------------+
```

---

## P8 — Até o fim do ciclo

```
+----------------------------------+
| Plano                            |
|                                  |
|  PREMIUM                         |
|  cancelada no fim do ciclo       |
|                                  |
|  Restam 2 de 4 até 20 out        |
|  Depois disso o plano acaba.     |
|                                  |
|  Sem próxima cobrança.           |
|                                  |
|  [ Ver regras ]                  |
|                                  |
+----------------------------------+
```

Não há "desfazer cancelamento". Fresha, na pesquisa, também não reativa: vende outra. Quando der 20 out, a aba volta a P1.

Se o cancelamento nasceu no app do Mercado Pago ou no banco, o webhook traz a mesma P8, com a linha "Cancelamento feito no seu banco, em 13 out." O passo 2 (horários depois do ciclo) roda no servidor com o padrão da decisão: cancela esses horários e avisa. A pessoa não estava no app para optar por avulso. O WhatsApp diz que foram cancelados e oferece remarcar. Manter como avulso, nesse caminho, fica com o admin no CRM, que pode recriar o horário ([08](08-admin-casa.md)).

Quem já tem plano vê P6 nesta aba, não a vitrine. Trocar de BLACK para PREMIUM, ou assinar um segundo plano por cima, não está decidido: não há tela de upgrade.
