# 07 — Barbeiro

O barbeiro vê a própria agenda, marca nela (inclusive encaixe) e bloqueia horário livre. Não edita a jornada da semana ([0032](../decisoes/0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md), [0034](../decisoes/0034-agendamento-feito-pela-barbearia.md)). Não cancela horário de cliente: isso devolve uso e avisa no WhatsApp, e fica com o admin.

Quem é admin e também corta usa estas mesmas telas, em qualquer agenda, e ganha a aba Casa ([08](08-admin-casa.md)).

```
Hoje | Agenda | Fechar | Eu
```

`Eu` é o perfil de [01](01-entrada-login-e-conta.md). O login é o mesmo código no celular que o admin cadastrou.

Referência: o app de quem atende na AppBarber tem bloqueio, encaixe e a comanda que nasce do horário. BestBarbers deixa a maquininha de fora e só registra. Square e Fresha mostram o dia; aqui o dia do barbeiro é uma lista, e o dia da equipe inteira é o quadro largo do admin.

---

## B1 — Hoje

```
+----------------------------------+
| Hoje · ter 13 out                |
|                                  |
|  09:00  Carlos                   |
|         Corte · PREMIUM          |
|                                  |
|  09:30  livre                    |
|                                  |
|  10:10  Ana · encaixe            |
|         Corte + barba · avulso   |
|         até 11:00                |
|                                  |
|  11:00  Pedro                    |
|         Corte · plano            |
|         assinatura suspensa      |
|                                  |
|  14:00  bloqueio · consulta      |
|                                  |
|  [ Bloquear ]    [ Novo horário ]|
|                                  |
| Hoje   Agenda   Fechar   Eu      |
+----------------------------------+
```

`assinatura suspensa` é o selo de [0018](../decisoes/0018-inadimplencia-suspende-e-reativa.md). No exemplo da manhã, Pedro está nesse estado. A lista é cedo, antes das 9h. O relógio das 14:46 aparece só na grade do cliente, em [03](03-cliente-agendamento.md).

Tocar um horário abre B2. Tocar `livre` abre o novo horário já com esse começo. A faixa `Fechar` ganha um ponto se existir horário passado sem desfecho.

---

## B2 — Horário do dia

```
+----------------------------------+
| <  09:00 · Carlos                |
|                                  |
|  Corte · 30 min                  |
|  coberto pelo PREMIUM            |
|  +55 11 9****-1234               |
|                                  |
|  Cancelar este horário é         |
|  com o admin.                    |
|                                  |
|  [ Abrir no fechar ]             |
|                                  |
+----------------------------------+
```

`Abrir no fechar` só existe depois que o horário começou, ou depois que ele passou. Antes disso o barbeiro não marca realizado nem falta.

Com parte avulsa, a linha do serviço repete a revisão do cliente: o que é coberto e o que será pago na casa.

---

## B3 — Jornada, só leitura

Dentro de Agenda, além dos dias.

```
+----------------------------------+
| <  Minha jornada                 |
|                                  |
|  seg–sex   09:00–19:00           |
|            intervalo 13:00–14:00 |
|  sáb       09:00–17:00           |
|  dom       fechado               |
|                                  |
|  Quem altera é o admin.          |
|                                  |
+----------------------------------+
```

Os números são exemplo de tela. A decisão não fixou o expediente da casa.

---

## B4 — Bloquear horário livre

```
+----------------------------------+
| <  Bloquear                      |
|                                  |
|  Qua 14 out                      |
|  das [ 14:00 ] às [ 16:00 ]      |
|                                  |
|  Motivo (opcional)               |
|  [ consulta________________ ]    |
|                                  |
|  Só entra onde não há cliente.   |
|                                  |
|  [ Bloquear ]                    |
|                                  |
+----------------------------------+
```

O admin é avisado no app, não no WhatsApp do barbeiro ([08](08-admin-casa.md), tela N1). O barbeiro pode apagar o próprio bloqueio. O admin também.

Se o intervalo pega alguém já marcado:

```
+----------------------------------+
|  15:00 já tem Carlos             |
|                                  |
|  Não dá para bloquear por cima.  |
|  Peça ao admin para cancelar     |
|  ou transferir o horário.        |
|  Aí o bloqueio cabe.             |
|                                  |
|  [ Voltar ]                      |
|                                  |
+----------------------------------+
```

O app não oferece "bloquear mesmo assim".

---

## B5 — Novo horário, na própria agenda

Atalho de B1, ou um buraco da grade. Pode ser agora, daqui a 20 minutos, ou fora de :00 e :30. As regras de plano são as mesmas do cliente ([0034](../decisoes/0034-agendamento-feito-pela-barbearia.md)): uso restante, no máximo 4 horários de plano, janela de 30 dias, dia e serviço cobertos ou avulso explícito.

```
+----------------------------------+
| <  Novo horário                  |
|                                  |
|  Hoje · 15:10                    |
|  fora da grade de 30 min         |
|                                  |
|  Cliente                         |
|  [ buscar nome ou celular____ ]  |
|                                  |
|  Carlos · PREMIUM                |
|  Ana · sem plano                 |
|                                  |
|  [ Cliente novo ]                |
|                                  |
+----------------------------------+
```

Cliente novo, só nome e telefone:

```
+----------------------------------+
| <  Cliente novo                  |
|                                  |
|  Nome                            |
|  [ __________________________ ]  |
|                                  |
|  Celular                         |
|  [ +55 (11) 9____-____        ]  |
|                                  |
|  A conta fica pré-criada.        |
|  Quando ele entrar com este      |
|  número, o histórico está lá.    |
|                                  |
|  [ Continuar ]                   |
|                                  |
+----------------------------------+
```

Se o telefone já existe, não nasce outra conta: a busca traz a pessoa e o botão de novo some.

Serviços iguais a A1. A revisão igual a A5, com três diferenças escritas no topo:

```
+----------------------------------+
|  Você está marcando por Carlos   |
|                                  |
|  Pode ser em cima da hora        |
|  e fora da grade.                |
|  Uso, cota e cobertura           |
|  valem como no app dele.         |
|                                  |
+----------------------------------+
```

Confirmar grava e, para quem já aceitou avisos, manda o WhatsApp de horário marcado. No pré-cadastro, as decisões de lembrete e de aceite ainda não se encontram; o texto da mensagem está em [10](10-mensagens-whatsapp.md), sem escolher o envio anterior ao primeiro login.

Sem uso para a parte coberta, a mesma trava do cliente. O barbeiro não "libera uma vez".

---

## B6 — Fechar

Lista do que já passou e não tem desfecho. É a seção de atendimentos de [0029](../decisoes/0029-avulso-presencial-e-confirmacao-de-atendimento.md).

```
+----------------------------------+
| Fechar                           |
|                                  |
|  Sem desfecho                    |
|  Ontem 18:00 · Lia · corte       |
|  Hoje 09:00 · Carlos · PREMIUM   |
|                                  |
| Hoje   Agenda   Fechar   Eu      |
+----------------------------------+
```

Tocar abre o desfecho. Não dá para fechar um horário que ainda não chegou.

### Realizado, só plano

```
+----------------------------------+
|  Carlos · hoje 09:00             |
|  Corte · coberto · 1 uso         |
|                                  |
|  [ Realizado ]                   |
|  [ Não veio ]                    |
|                                  |
+----------------------------------+
```

`Realizado` consome o uso (se ainda estava só reservado) e gera a comissão do percentual de assinante sobre o valor cheio ([0023](../decisoes/0023-comissao-por-barbeiro-e-servico.md)). Não pergunta forma de pagamento: não houve avulso.

### Realizado, com avulso

```
+----------------------------------+
|  Ana · hoje 10:10                |
|  Corte + barba · avulso          |
|  valor cheio, pago na casa       |
|                                  |
|  Como ela pagou?                 |
|  ( ) Dinheiro                    |
|  ( ) Pix                         |
|  ( ) Débito na maquininha        |
|  ( ) Crédito na maquininha       |
|                                  |
|  [ Confirmar realizado ]         |
|  [ Não veio ]                    |
|                                  |
+----------------------------------+
```

Visita mista (corte coberto + barba avulsa) pede a forma só da parte avulsa. A parte coberta não tem forma. Comissão: percentual de assinante no coberto e percentual de avulso no resto.

O Pix desta lista é o Pix do balcão, na maquininha ou no banco da casa. Não é a Woovi.

### Não veio

```
+----------------------------------+
|  Marcar falta de Carlos?         |
|                                  |
|  Ele é assinante e não cancelou  |
|  até 2h antes.                   |
|  Este uso fica consumido.        |
|  O admin vê a falta na ficha.    |
|  Você não recebe comissão.       |
|                                  |
|  [ Confirmar falta ]             |
|  [ Voltar ]                      |
|                                  |
+----------------------------------+
```

Avulso:

```
+----------------------------------+
|  Marcar falta de Ana?            |
|                                  |
|  Cliente avulso.                 |
|  Falta não tem custo             |
|  e não gera comissão.            |
|                                  |
|  [ Confirmar falta ]             |
|  [ Voltar ]                      |
|                                  |
+----------------------------------+
```

### Suspensa na hora de atender

O selo estava no horário e o plano segue suspenso. `Realizado` não oferece "coberto". As linhas cobertas passam a valor cheio, forma de pagamento obrigatória, comissão de avulso. O texto da tela:

```
+----------------------------------+
|  Assinatura suspensa             |
|  Sem regularizar até agora,      |
|  este corte é avulso,            |
|  pago na barbearia.              |
+----------------------------------+
```

Se ele regularizou no meio, o selo some e o fechamento volta a ser de plano.

---

## B7 — A receber

No `Eu` do barbeiro, ou no topo de Fechar se couber melhor no uso diário. Fica em `Eu`, porque não é um desfecho: é leitura do mês ([0003](../decisoes/0003-escopo-funcional-por-perfil.md), [0009](../decisoes/0009-repasse-manual-aos-barbeiros.md)).

```
+----------------------------------+
| <  A receber · outubro           |
|                                  |
|  Em aberto           R$ xx,xx    |
|  Já marcado como pago R$ xx,xx   |
|                                  |
|  13 out · Carlos · corte         |
|  plano · xx% do valor cheio      |
|  R$ xx,xx · em aberto            |
|                                  |
|  13 out · Ana · barba            |
|  avulso · xx% do valor cheio     |
|  R$ xx,xx · em aberto            |
|                                  |
|  O admin paga por fora           |
|  e marca aqui como pago.         |
|  Este valor é o que você recebe. |
|                                  |
+----------------------------------+
```

`xx` é de propósito. O percentual e o valor cheio são cadastro, não decisão. O que a decisão fixa é: o número desta tela é o número que o admin paga, calculado na hora do atendimento, e não muda se o percentual mudar depois.

Falta não aparece nesta lista. Não houve comissão.

Não há botão de saque, Pix do barbeiro nem "pedir o repasse".
