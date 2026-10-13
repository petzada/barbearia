# 10 — Mensagens no WhatsApp

Não existe SMS de login. [0017](../decisoes/0017-login-whatsapp-otp-e-google.md) escolheu código no WhatsApp e Google como reserva, e descartou e-mail e SMS pago. Esta página é o que a pessoa lê na conversa.

Provedor: WhatsMiau ([0010](../decisoes/0010-whatsapp-via-whatsmiau.md)). O WhatsApp pessoal do dono fica fora.

| Fase | Quem fala | O que manda ([0031](../decisoes/0031-whatsmiau-planos-e-numeros-por-fase.md)) |
| --- | --- | --- |
| Desenvolvimento e piloto | Um número de teste, nome e foto da Barbearia do Moura | Código, lembrete e aviso |
| Depois do MVP validado | Dois números, os dois com nome e foto da casa | Um só código. O outro, lembrete e aviso |

O código de entrada é pedido pela pessoa: sai mesmo se ela desligou os avisos. Lembrete e aviso, no geral, só vão para quem aceitou em [01](01-entrada-login-e-conta.md). Volume baixo, sem disparo em massa.

Há um encontro sem desenho fechado. [0034](../decisoes/0034-agendamento-feito-pela-barbearia.md) diz que o cliente pré-cadastrado recebe os lembretes normalmente. [0010](../decisoes/0010-whatsapp-via-whatsmiau.md) diz que só se envia a quem aceitou. Antes do primeiro login esse aceite não existe. As bolhas abaixo são o texto. Qual das duas regras vence nesse intervalo não está desenhado aqui.

Não há mensagem de marketing, aniversário, "sua cadeira está pronta" nem aviso para o barbeiro no WhatsApp pessoal dele. Bloqueio de agenda avisa o admin **dentro do app** ([08](08-admin-casa.md)).

Forma da conversa, no piloto (um número só):

```
+----------------------------------+
| Barbearia do Moura          foto |
|----------------------------------|
|                                  |
|  Seu código da Barbearia do      |
|  Moura: 482190                   |
|                                  |
|  Vale por 5 minutos.             |
|  Não compartilhe.                |
|                           14:02  |
|                                  |
+----------------------------------+
```

Depois da separação, essa bolha vem do número de códigos. As de baixo vêm do número de avisos. O texto não muda.

---

## Código

Disparo: E2 ou E7. Validade 5 minutos. Reenvio invalida o anterior.

```
+----------------------------------+
| Seu código da Barbearia do       |
| Moura: 482190                    |
|                                  |
| Vale por 5 minutos.              |
| Não compartilhe.                 |
+----------------------------------+
```

Sem link, sem plano, sem horário.

---

## Horário marcado

Disparo: o cliente confirmou no app, ou a casa marcou por ele, e ele já aceitou avisos.

```
+----------------------------------+
| Horário marcado                  |
| Qui 15 out, 15:00                |
| Corte com Moura                  |
|                                  |
| Coberto pelo seu plano.          |
| Cancela pelo app até 13:00.      |
| Depois disso o uso é consumido.  |
+----------------------------------+
```

Visita mista:

```
+----------------------------------+
| Horário marcado                  |
| Qui 15 out, 15:00                |
| Corte com Moura, pelo plano.     |
| Barba paga na barbearia.         |
|                                  |
| Cancela pelo app até 13:00.      |
+----------------------------------+
```

Visita toda avulsa (sem plano, ou GOLD fora do dia):

```
+----------------------------------+
| Horário marcado                  |
| Sex 16 out, 15:00                |
| Corte com Moura                  |
|                                  |
| Pagamento na barbearia.          |
| Cancela pelo app até 13:00.      |
+----------------------------------+
```

---

## Lembrete

A decisão pede lembrete e não fixa o horário do envio (na véspera, de manhã, 2h antes). A tela assume **um** lembrete, no dia anterior, enquanto isso não for fechado. Não desenhar dois lembretes.

```
+----------------------------------+
| Lembrete                         |
| Amanhã, qui 15 out, 15:00        |
| Corte com Moura                  |
|                                  |
| Para cancelar e devolver o uso,  |
| use o app até 13:00.             |
+----------------------------------+
```

No avulso, a última frase troca para "Para cancelar, use o app até 13:00." Não fala em uso.

---

## A casa cancelou

Admin cancelou. O uso de plano volta. Nunca custa ao cliente ([0032](../decisoes/0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md)).

```
+----------------------------------+
| A Barbearia do Moura cancelou    |
| qui 15 out, 15:00.               |
|                                  |
| O uso do plano voltou.           |
| Remarque pelo app:               |
| https://link-da-casa/remarcar    |
+----------------------------------+
```

O link abre o app já no passo do serviço ([03](03-cliente-agendamento.md)). Se a sessão de 90 dias acabou, pede o código e segue para esse passo.

---

## A casa trocou o barbeiro

```
+----------------------------------+
| Seu horário de qui 15 out,       |
| 15:00, passou de Moura para      |
| o barbeiro B.                    |
|                                  |
| O serviço e o uso do plano       |
| continuam os mesmos.             |
+----------------------------------+
```

---

## Assinatura

Pagamento aprovado, plano ativo:

```
+----------------------------------+
| PREMIUM ativo.                   |
| 4 usos até 20 out.               |
| Não acumulam.                    |
|                                  |
| Você pode ter até 4 horários     |
| de plano ao mesmo tempo,         |
| até 30 dias à frente.            |
+----------------------------------+
```

Cancelamento confirmado pelo gateway ([0021](../decisoes/0021-cliente-cancela-assinatura-sozinho.md)). Só sai **depois** da confirmação:

```
+----------------------------------+
| Assinatura cancelada.            |
| Não haverá nova cobrança.        |
|                                  |
| PREMIUM vale até 20 out,         |
| com os usos que ainda restam.    |
|                                  |
| Horários depois dessa data       |
| foram cancelados.                |
| O uso deles voltou.              |
+----------------------------------+
```

Se a pessoa escolheu manter algum horário pós-ciclo como avulso, a mensagem lista esses horários no lugar da última frase: "Qui 22 out, 11:00, ficou marcado. Pagamento na barbearia."

Veio do app do banco ou do Mercado Pago, não do nosso botão: o mesmo texto, mais a linha "Registramos o cancelamento feito no seu banco."

---

## Pagamento que falhou

[0018](../decisoes/0018-inadimplencia-suspende-e-reativa.md). Benefício já suspenso.

```
+----------------------------------+
| Não entrou o pagamento do        |
| PREMIUM. O benefício está        |
| suspenso.                        |
|                                  |
| Regularize pelo app.             |
| Horários já marcados ficam       |
| guardados até 2 horas antes.     |
| Se continuar pendente, eles      |
| são cancelados.                  |
+----------------------------------+
```

Horário derrubado pelo prazo:

```
+----------------------------------+
| Cancelamos qui 22 out, 15:00,    |
| porque o PREMIUM segue sem       |
| pagamento.                       |
|                                  |
| Quando o pagamento entrar,       |
| o plano volta sozinho.           |
| O horário não volta: remarque.   |
+----------------------------------+
```

Retentativas do Mercado Pago ou do Pix acabaram sem aprovação. A assinatura é cancelada no app e no gateway, sem esperar as 3 parcelas que o Mercado Pago aguardaria:

```
+----------------------------------+
| PREMIUM cancelado.               |
| As tentativas de cobrança        |
| acabaram sem pagamento.          |
|                                  |
| Você pode assinar de novo        |
| pelo app quando quiser.          |
+----------------------------------+
```

Pagamento que entra depois (retentativa ou pagamento manual) não precisa de texto longo. Um aviso basta:

```
+----------------------------------+
| Pagamento confirmado.            |
| Seu PREMIUM voltou.              |
+----------------------------------+
```
