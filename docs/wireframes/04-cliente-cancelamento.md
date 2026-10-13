# 04 — Cancelamento de horário

O cliente cancela pelo app até 2 horas antes ([0011](../decisoes/0011-cancelamento-ate-2h-antes.md)). Todo horário que ele mesmo marcou nasce dentro dessa janela, porque o app também exige 2 horas para marcar ([0035](../decisoes/0035-antecedencia-minima-2h.md)).

Cancelar a tempo devolve o uso reservado. Não cancelar até 2 horas antes consome o uso: falta ou desistência tardia ([0025](../decisoes/0025-uso-do-plano-ciclo-e-consumo.md)). Falta de cliente avulso não tem custo ([0029](../decisoes/0029-avulso-presencial-e-confirmacao-de-atendimento.md)).

Cancelamento feito pela barbearia nunca custa ao cliente ([0032](../decisoes/0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md)). Quem aperta esse botão é o admin, não o barbeiro. A tela do admin está em [08-admin-casa.md](08-admin-casa.md).

Não há taxa, crédito interno nem depósito a devolver. AppBarber, no pagamento online, transforma cancelamento em crédito na loja; aqui o avulso nem chegou a ser cobrado.

---

## C1 — Detalhe, ainda dá para cancelar

Qui 15 out 15:00, agora é qui 15 out 10:00. Faltam 5 horas.

```
+----------------------------------+
| <  Seu horário                   |
|                                  |
|  Qui 15 out · 15:00              |
|  Corte · Moura · 30 min          |
|  Coberto pelo PREMIUM            |
|                                  |
|  Você pode cancelar até 13:00.   |
|  O uso volta para o ciclo.       |
|                                  |
|  [ Cancelar horário ]            |
|                                  |
+----------------------------------+
```

Parte avulsa no mesmo horário entra como linha, igual à revisão: "Barba, valor cheio, ia ser pago na barbearia. Nada foi cobrado."

---

## C2 — Confirmar o cancelamento

```
+----------------------------------+
|  Cancelar qui 15 out, 15:00?     |
|                                  |
|  O uso deste ciclo volta.        |
|  Você fica com 3 de 4.           |
|                                  |
|  [ Sim, cancelar ]               |
|  [ Manter horário ]              |
|                                  |
+----------------------------------+
```

Avulso, sem uso envolvido:

```
+----------------------------------+
|  Cancelar qui 15 out, 15:00?     |
|                                  |
|  Nada é cobrado.                 |
|  A vaga abre para outra pessoa.  |
|                                  |
|  [ Sim, cancelar ]               |
|  [ Manter horário ]              |
|                                  |
+----------------------------------+
```

`Sim, cancelar` fecha na hora. Não espera gateway: horário não é cobrança.

```
+----------------------------------+
|  Horário cancelado               |
|                                  |
|  O uso voltou.                   |
|  3 de 4 até 20 out.              |
|                                  |
|  [ Agendar de novo ]             |
|                                  |
+----------------------------------+
```

---

## C3 — Menos de 2 horas

Agora é qui 15 out 13:30. O horário é 15:00.

```
+----------------------------------+
| <  Seu horário                   |
|                                  |
|  Qui 15 out · 15:00              |
|  Corte · Moura                   |
|  Coberto pelo PREMIUM            |
|                                  |
|  Passou das 13:00.               |
|  Este uso fica consumido,        |
|  mesmo se você não vier.         |
|                                  |
|  Para trocar, fale na barbearia. |
|                                  |
+----------------------------------+
```

Sem botão de cancelar. "Fale na barbearia" não abre WhatsApp do dono dentro do app: se a casa for cancelar, o admin faz isso e o uso volta. O cliente não tem um atalho que contorne as 2 horas.

Avulso dentro das 2 horas:

```
+----------------------------------+
|  Passou das 13:00.               |
|  O app não cancela mais.         |
|                                  |
|  Se você não vier, não há        |
|  cobrança de falta.              |
|                                  |
+----------------------------------+
```

O desfecho ainda depende de o barbeiro marcar falta ou realizado. Até lá, o horário segue na lista como marcado.

---

## C4 — A casa cancelou

O cliente abre o app pelo aviso ou pela faixa do início.

```
+----------------------------------+
|  A barbearia cancelou            |
|                                  |
|  Qui 15 out · 15:00              |
|  Corte · Moura                   |
|                                  |
|  O uso voltou para o seu ciclo.  |
|  Você não perde esse corte.      |
|                                  |
|  [ Remarcar ]                    |
|                                  |
+----------------------------------+
```

`Remarcar` abre A1, sem reaproveitar um horário que já não existe. O link do WhatsApp ([10](10-mensagens-whatsapp.md)) cai nesta tela se a sessão ainda vale; se não vale, pede o código e depois abre aqui.

---

## C5 — A casa trocou o barbeiro

```
+----------------------------------+
|  Horário atualizado              |
|                                  |
|  Qui 15 out · 15:00              |
|  Corte                           |
|  Agora com o barbeiro B          |
|  Antes: Moura                    |
|                                  |
|  Continua coberto pelo plano.    |
|  O prazo para cancelar não muda. |
|                                  |
|  [ Ok ]                          |
|                                  |
+----------------------------------+
```

Transferir não devolve nem consome uso. Se o novo barbeiro não realiza aquele serviço, o admin não conclui a transferência: a tela dele explica, em [08](08-admin-casa.md). Duração é a do serviço, igual para os dois ([0033](../decisoes/0033-duracao-dos-servicos-e-grade-30-min.md)), então o bloco de tempo cabe do mesmo jeito se a jornada do destino estiver livre.

---

## O que o cliente não vê

- Botão de falta. Falta é desfecho de quem atendeu ([07](07-barbeiro.md)).
- Multa ou cobrança de cartão por não ter vindo.
- Cancelar com menos de 2 horas "só desta vez".
- Pedido de cancelamento que fica "em análise". Ou cancela, ou a hora já passou.
