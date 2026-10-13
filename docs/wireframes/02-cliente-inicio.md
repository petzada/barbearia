# 02 — Início do cliente

Depois da conta, o cliente cai numa casca de app com quatro abas ([0001](../decisoes/0001-produto-web-mobile-first-estilo-app.md), [0003](../decisoes/0003-escopo-funcional-por-perfil.md)):

| Aba | Função |
| --- | --- |
| Início | Próximo horário e o estado do plano |
| Horários | Tudo o que está marcado e o que já passou |
| Plano | Vitrine, uso do ciclo, cancelar, regularizar |
| Eu | Nome, celular, Google, avisos, instalar |

Não há busca de outras barbearias. O app é de uma casa só.

Barbeiro não usa estas abas. Admin que também corta usa as abas de [07-barbeiro.md](07-barbeiro.md) mais `Casa`.

---

## H1 — Sem horário e sem plano

```
+----------------------------------+
| Olá, Carlos                      |
|                                  |
|  Nenhum horário marcado.         |
|                                  |
|  [ Agendar ]                     |
|                                  |
|  +----------------------------+  |
|  | Planos                     |  |
|  | 4 usos por ciclo           |  |
|  | a partir de R$ 129,90      |  |
|  | [ Ver planos ]             |  |
|  +----------------------------+  |
|                                  |
| Início  Horários  Plano  Eu      |
+----------------------------------+
```

`Agendar` abre o fluxo de [03-cliente-agendamento.md](03-cliente-agendamento.md) como avulso: tudo pago na barbearia. `Ver planos` abre [05-cliente-planos.md](05-cliente-planos.md).

O cartão cita a cota logo, no mesmo espírito do ShavingPass. Não diz "corte à vontade".

---

## H2 — Com plano e próximo horário

Exemplo: PREMIUM cobrado em 20 set, próxima cobrança em 20 out. Dois usos deste ciclo já estão reservados ou feitos, então restam 2. Hoje é terça, 13 out.

```
+----------------------------------+
| Olá, Carlos                      |
|                                  |
|  PREMIUM                         |
|  Restam 2 de 4 neste ciclo      |
|  Válidos até 20 out              |
|  Não acumula.                    |
|                                  |
|  Próximo                         |
|  Qui 15 out · 15:00              |
|  Corte · Moura                   |
|  Coberto pelo plano              |
|                                  |
|  [ Ver horário ]                 |
|  [ Agendar outro ]               |
|                                  |
|  1 horário de plano marcado      |
|  Você pode ter até 4,            |
|  até 30 dias à frente.           |
|                                  |
| Início  Horários  Plano  Eu      |
+----------------------------------+
```

"Restam 2 de 4" é o que ainda dá para marcar neste ciclo: 4 menos o que já foi feito ou está reservado. Cancelar até 2h antes devolve o reservado ([0025](../decisoes/0025-uso-do-plano-ciclo-e-consumo.md)). O teto de 4 horários ao mesmo tempo e a janela de 30 dias (daqui até 12 nov) são o padrão da casa, configurável por plano ([0026](../decisoes/0026-horarios-futuros-do-assinante.md)).

Se o próximo tiver parte avulsa (BLACK com barba, ou GOLD fora de terça e quarta), a linha do meio troca para o que a revisão já mostrou:

```
+----------------------------------+
|  Qui 15 out · 15:00              |
|  Corte · coberto                 |
|  Barba · R$ valor cheio          |
|  paga na barbearia               |
+----------------------------------+
```

O valor cheio é o cadastrado pelo admin. Não se cobra no app ([0029](../decisoes/0029-avulso-presencial-e-confirmacao-de-atendimento.md)).

---

## H3 — Lista de horários

```
+----------------------------------+
| Horários                         |
|                                  |
|  Marcados                        |
|  Qui 15 out · 15:00              |
|  Corte · Moura · plano           |
|  Cancela até qui 13:00           |
|                                  |
|  Qui 22 out · 11:00              |
|  Corte · Moura · próximo ciclo   |
|                                  |
|  Passados                        |
|  Sex 9 out · realizado           |
|                                  |
| Início  Horários  Plano  Eu      |
+----------------------------------+
```

Tocar um marcado abre o detalhe em [04-cliente-cancelamento.md](04-cliente-cancelamento.md). Tocar um passado abre só leitura: serviço, barbeiro, se foi plano ou avulso, e o desfecho (realizado ou falta). Não tem botão de pagar.

`Qui 22 out` é depois da cobrança de 20 out e ainda cabe nos 30 dias (até 12 nov). O uso é do ciclo dessa data, não do ciclo atual ([0026](../decisoes/0026-horarios-futuros-do-assinante.md)).

---

## H4 — Faixa que muda o início

Uma faixa no topo de H2, no lugar de repetir a tela inteira. O corpo do caso está nos arquivos ligados.

| Faixa | Quando | Toque |
| --- | --- | --- |
| `Assinatura suspensa. Regularizar` | Recusa do cartão, ou Pix não pago até o fim do dia do vencimento ([0018](../decisoes/0018-inadimplencia-suspende-e-reativa.md)) | [06](06-cliente-inadimplencia.md) |
| `Sua assinatura vai até 20 out e não renova` | Cancelou, gateway já confirmou, ciclo pago ainda vale ([0021](../decisoes/0021-cliente-cancela-assinatura-sozinho.md)) | [05](05-cliente-planos.md) |
| `A barbearia cancelou qui 15 out. O uso voltou.` | Admin cancelou ([0032](../decisoes/0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md)) | Remarcar, fluxo 03 |
| `Seu horário de qui 15 out passou para o barbeiro B` | Admin transferiu | Detalhe do horário |

A faixa some depois que a pessoa abre o destino, ou quando o fato deixa de ser verdade (pagamento entrou, horário remarcado).
