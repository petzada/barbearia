# 03 — Agendamento do cliente

O cliente marca no app com pelo menos 2 horas de antecedência ([0035](../decisoes/0035-antecedencia-minima-2h.md)). A grade começa em hora cheia ou meia ([0033](../decisoes/0033-duracao-dos-servicos-e-grade-30-min.md)). Encaixe em horário quebrado é só da casa, em [07-barbeiro.md](07-barbeiro.md).

A ordem é a de Booksy, Fresha e theCut: serviço, profissional, horário. A GlossGenius deixa reservar sem conta; aqui o telefone já foi confirmado antes. Não há "qualquer barbeiro": a reclamação do Wilker, na pesquisa, é justamente perder a cadeira de quem ele quer.

Durações abaixo são exemplo. O admin cadastra a duração real, igual para todos os barbeiros. Vários itens na mesma visita somam, e o fim arredonda para cima até fechar 30 minutos.

```
Agendar (aba Início ou Horários)
    --> A1 serviços
    --> A2 barbeiro
    --> A3 dia
    --> A4 grade
    --> A5 revisão
    --> A6 confirmado
```

---

## A1 — Serviços

```
+----------------------------------+
| <  O que vai fazer?              |
|                                  |
|  [ ] Corte                  30m  |
|  [ ] Barba                  30m  |
|  [ ] Corte + barba          50m  |
|                                  |
|  Durações de exemplo.            |
|                                  |
|  [ Continuar ]                   |
|                                  |
+----------------------------------+
```

Dá para marcar mais de um item. `Corte + barba` é um serviço só, com duração própria, não a soma ([0033](../decisoes/0033-duracao-dos-servicos-e-grade-30-min.md)). Se a pessoa marca Corte e Barba separados, a visita dura 60 minutos. Se marca o combo de 50, a grade ocupa 60.

Serviço sem duração cadastrada não aparece.

---

## A2 — Barbeiro

```
+----------------------------------+
| <  Com quem?                     |
|                                  |
|  Moura                           |
|  próximo livre: qui 16 · 15:00   |
|                                  |
|  Barbeiro B                      |
|  próximo livre: qui 16 · 11:00   |
|                                  |
|  Fora da jornada não aparece.    |
|                                  |
+----------------------------------+
```

A lista é a equipe ativa. Bloqueio e horário já ocupado não entram no "próximo livre". Tocar o nome segue para o dia, já filtrado nessa agenda.

---

## A3 — Dia

Assinante, plano que cobre qualquer dia (BLACK só corte; PREMIUM corte e barba):

```
+----------------------------------+
| <  Qual dia?                     |
|     outubro                      |
|                                  |
|  seg  ter  qua  qui  sex  sab    |
|            14   15   16   17     |
|   19   20   21   22   23   24    |
|                                  |
|  Até 12 nov (30 dias).           |
|  Hoje só se ainda der 2h.        |
|                                  |
+----------------------------------+
```

Dia passado e dia além da janela do plano ficam apagados. A janela padrão é 30 dias ([0026](../decisoes/0026-horarios-futuros-do-assinante.md)).

GOLD LIMITADO cobre terça e quarta. Os outros dias continuam tocáveis: a visita inteira vira avulsa e não gasta uso ([0027](../decisoes/0027-cobertura-do-plano-e-parte-avulsa.md)).

```
+----------------------------------+
| <  Qual dia?                     |
|                                  |
|  ter e qua · pelo plano          |
|  os outros dias · pago na casa   |
|  não gasta uso                   |
|                                  |
|  seg  ter  qua  qui  sex         |
|   ·   14   15    $    $          |
|                                  |
+----------------------------------+
```

`$` aqui não é preço. É o dia em que nada da visita entra no plano.

Cliente **sem** plano vê o calendário só com a regra das 2 horas. A decisão não dá a ele o teto de 30 dias nem o de 4 horários. O wireframe não inventa esse teto: o mês seguinte continua navegável.

---

## A4 — Grade

Dia futuro, corte de 30 minutos com Moura. 15:00 aparece porque ainda falta mais de 2 horas.

```
+----------------------------------+
| <  Qui 15 out · Moura            |
|    Corte · 30 min                |
|                                  |
|  09:00   ocupado                 |
|  09:30   livre                   |
|  10:00   livre                   |
|  10:30   bloqueio da casa        |
|  11:00   livre                   |
|  ...                             |
|  15:00   livre                   |
|                                  |
+----------------------------------+
```

Se o dia escolhido é hoje, terça 13 out, e agora são 14:46, a mesma grade esconde o que está a menos de 2 horas. 15:00, 16:00 e 16:30 somem. O primeiro horário é 17:00.

```
+----------------------------------+
| <  Hoje · Moura                  |
|    Corte · 30 min                |
|                                  |
|  17:00   livre                   |
|  17:30   livre                   |
|  18:00   livre                   |
|                                  |
|  Antes disso está a menos de 2h. |
|  Em cima da hora, peça na casa.  |
|                                  |
+----------------------------------+
```

`ocupado` e `bloqueio` aparecem apagados, sem toque, para a pessoa entender o buraco. Livre segue para A5.

Visita de 60 minutos (corte + barba) só oferece um início se os 60 minutos cabem antes do bloqueio, do fim da jornada ou de outro horário. Começar 10:30 quando 11:00 está cheio não aparece como livre.

A jornada é a que o admin gravou ([0032](../decisoes/0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md)). Fora dela não há linha.

---

## A5 — Revisão, antes de confirmar

A regra do plano é repetida aqui, não só na hora de assinar ([0025](../decisoes/0025-uso-do-plano-ciclo-e-consumo.md)). Nada é cobrado no app. Referência da Fresha: o item coberto vai a zero na revisão. Referência que não entra: depósito da Booksy e pré-autorização do theCut.

### PREMIUM, só corte, dentro do ciclo pago

```
+----------------------------------+
| <  Confira                       |
|                                  |
|  Qui 15 out · 15:00              |
|  Moura · 30 min                  |
|                                  |
|  Corte                           |
|  coberto · 1 uso                 |
|  nada a pagar agora              |
|                                  |
|  Ciclo até 20 out                 |
|  depois deste, restam 2 de 4     |
|                                  |
|  Até qui 13:00 você cancela      |
|  e o uso volta.                  |
|  Depois disso o uso fica         |
|  consumido, mesmo se não vier.   |
|                                  |
|  [ Confirmar horário ]           |
|                                  |
+----------------------------------+
```

Uma visita coberta gasta 1 uso, com corte, barba ou os dois, dentro do que o plano cobre ([0027](../decisoes/0027-cobertura-do-plano-e-parte-avulsa.md)). PREMIUM com corte e barba no mesmo dia continua 1 uso, e as duas linhas dizem "coberto".

### BLACK, corte e barba

```
+----------------------------------+
| <  Confira                       |
|                                  |
|  Qui 15 out · 15:00 · Moura      |
|  ocupa 60 min                    |
|                                  |
|  Corte                           |
|  coberto · 1 uso                 |
|                                  |
|  Barba                           |
|  fora do BLACK                   |
|  valor cheio, pago na barbearia  |
|  não gasta outro uso             |
|                                  |
|  [ Confirmar horário ]           |
|                                  |
+----------------------------------+
```

### GOLD numa sexta

```
+----------------------------------+
| <  Confira                       |
|                                  |
|  Sex 16 out · 15:00 · Moura      |
|                                  |
|  GOLD cobre terça e quarta.      |
|  Esta visita é avulsa.           |
|  Valor cheio, pago na barbearia. |
|  Não gasta uso do plano.         |
|                                  |
|  [ Confirmar horário ]           |
|                                  |
+----------------------------------+
```

### Horário no ciclo seguinte

Qui 22 out, e a próxima cobrança é 20 out. Cabe nos 30 dias (até 12 nov) e a pessoa ainda tem menos de 4 horários de plano.

```
+----------------------------------+
|  Qui 22 out · 11:00 · Moura      |
|  Corte · coberto                 |
|                                  |
|  Este uso é do ciclo que         |
|  começa em 20 out, não do atual. |
|                                  |
|  Se aquela cobrança não entrar,  |
|  o horário fica guardado até     |
|  2 horas antes e é cancelado     |
|  se continuar pendente.          |
|                                  |
|  [ Confirmar horário ]           |
|                                  |
+----------------------------------+
```

O app reserva o uso desse ciclo futuro na confirmação ([0025](../decisoes/0025-uso-do-plano-ciclo-e-consumo.md), [0026](../decisoes/0026-horarios-futuros-do-assinante.md)).

### Sem plano

```
+----------------------------------+
|  Qui 15 out · 15:00 · Moura      |
|  Corte                           |
|                                  |
|  Pagamento na barbearia,         |
|  no valor cheio.                 |
|  Nada é cobrado neste app.       |
|                                  |
|  Cancela pelo app até 13:00.     |
|                                  |
|  [ Confirmar horário ]           |
|                                  |
+----------------------------------+
```

---

## A6 — Confirmado

```
+----------------------------------+
|                                  |
|  Marcado                         |
|                                  |
|  Qui 15 out · 15:00              |
|  Corte · Moura                   |
|                                  |
|  Se você aceitou avisos,         |
|  chega uma mensagem no WhatsApp. |
|                                  |
|  [ Ver meus horários ]           |
|  [ Fechar ]                      |
|                                  |
+----------------------------------+
```

`Fechar` volta ao início. O horário já aparece em H2.

---

## Travas, no lugar da revisão

O botão de confirmar não nasce apagado no fim de um fluxo longo. A trava aparece assim que o dia ou o horário deixa de ser válido, com o motivo e uma saída.

```
+----------------------------------+
|  Sem uso neste ciclo             |
|                                  |
|  Os 4 usos até 20 out já estão   |
|  em horários marcados.           |
|  Uso não acumula.                |
|                                  |
|  Dá para marcar no ciclo         |
|  seguinte, se a data estiver     |
|  a até 30 dias.                  |
|                                  |
|  [ Escolher outro dia ]          |
|                                  |
+----------------------------------+
```

```
+----------------------------------+
|  Você já tem 4 horários          |
|  de plano                        |
|                                  |
|  Cancele um até 2h antes         |
|  para abrir vaga, ou marque      |
|  um dia em que a visita seja     |
|  só avulsa.                      |
|                                  |
|  [ Ver meus horários ]           |
|                                  |
+----------------------------------+
```

Visita só avulsa (GOLD fora de terça e quarta, ou só barba no BLACK) não entra nesses 4 e não pede uso. A cota é de horário **de plano** ([0026](../decisoes/0026-horarios-futuros-do-assinante.md)).

Não há botão "pagar o corte cheio porque acabou a cota". A decisão impede marcar mais horários de plano do que os usos restantes. Converter o serviço coberto em avulso quando a cota zera não está escrito.

Dia a mais de 30 dias nem recebe toque. Horário a menos de 2 horas não está na grade.
