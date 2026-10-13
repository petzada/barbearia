# 08 — Admin, a casa

O admin tem tudo do barbeiro ([07](07-barbeiro.md)) e a gestão ([0002](../decisoes/0002-tres-perfis-de-usuario.md), [0003](../decisoes/0003-escopo-funcional-por-perfil.md)). No celular as abas são:

```
Hoje | Agenda | Fechar | Casa
```

`Hoje` pode ser a agenda dele, se ele também corta, com um filtro para ver outro barbeiro. `Fechar` lista pendências de todas as cadeiras, não só da dele. `Casa` é o backoffice. O perfil (E10) fica no fim de Casa.

No computador, a agenda do dia é o quadro largo G1. O CRM é a lista com a ficha ao lado, G2. São as mesmas ações. Booksy Biz, Fresha e o site da Trinks mostram o dia em colunas; o WebAdmin da AppBarber é o modelo do CRM, sem o diretório de outras barbearias.

---

## G1 — Dia da equipe

```
+------------------------------------------------------------------+
| ter 13 out                          [ < ]  [ > ]   [ Novo ]      |
|------------------------------------------------------------------|
|        Moura                 Barbeiro B                          |
| 09:00  Carlos · PREMIUM      livre                               |
| 09:30  livre                 livre                               |
| 10:10  Ana · encaixe avulso  livre                               |
|        corte + barba, até 11                                      |
| 11:00  Pedro · plano         livre                               |
|        selo: suspensa                                             |
| 14:00  bloqueio · consulta   livre                               |
+------------------------------------------------------------------+
```

Tocar uma célula livre abre o novo horário de B5, já com aquele barbeiro. Tocar um nome abre B2, e aqui existe `Cancelar` e `Transferir`. O admin marca na agenda de qualquer um ([0034](../decisoes/0034-agendamento-feito-pela-barbearia.md)).

No celular, o mesmo dia é a lista de B1 com um seletor no topo: `Moura | Barbeiro B | Barbeiro C | Todos`.

---

## G2 — Clientes

Estilo CRM ([0020](../decisoes/0020-cadastro-aberto-admin-gerencia-no-backoffice.md)): lista, assinatura, histórico, pagamentos, sinalizações.

```
+------------------------------------------------------------------+
| Clientes                                          [ buscar ]     |
|------------------------------------------------------------------|
| Carlos     PREMIUM · ativa      1 falta neste ciclo     >        |
| Ana        sem plano            —                        >        |
| Pedro      PREMIUM · suspensa   pagamento não entrou     >        |
| Lia        GOLD · até 2 nov     cancelou, ciclo vale     >        |
+------------------------------------------------------------------+
```

A falta é insight, não um cadeado ([0025](../decisoes/0025-uso-do-plano-ciclo-e-consumo.md)). Não há regra decidida de "3 faltas bloqueiam a agenda". A ficha mostra o fato; não esconde o botão de marcar.

Ficha:

```
+----------------------------------+
| <  Carlos                        |
|    +55 11 9****-1234             |
|    cliente desde 2 out           |
|                                  |
|  PREMIUM · ativa                 |
|  cartão · próxima 20 out         |
|  Restam 2 de 4 até 20 out        |
|                                  |
|  Pagamentos                      |
|  20 ago · R$ 199,90 · aprovado   |
|  20 set · R$ 199,90 · aprovado   |
|                                  |
|  Faltas                          |
|  9 set · ciclo anterior          |
|  uso daquele ciclo, consumido    |
|                                  |
|  Horários                        |
|  qui 15 out · 15:00 · Moura      |
|  [ Cancelar ]  [ Transferir ]    |
|                                  |
|  [ Marcar horário ]              |
|                                  |
+----------------------------------+
```

O admin não aperta "cancelar assinatura" no lugar do cliente. O cliente faz isso, e o gateway confirma ([0021](../decisoes/0021-cliente-cancela-assinatura-sozinho.md)). Se o cancelamento veio do banco, a ficha mostra o mesmo estado que P8, para a casa deixar de dizer que não vê a cobrança.

Não há chave "pode assinar".

`Marcar horário` é B5 com o cliente já escolhido.

---

## G3 — Cancelar horário de cliente

```
+----------------------------------+
|  Cancelar qui 15 out, 15:00      |
|  de Carlos com Moura?            |
|                                  |
|  O uso do plano volta.           |
|  Ele recebe o WhatsApp com       |
|  o link para remarcar,           |
|  se aceitou avisos.              |
|                                  |
|  Motivo interno (opcional)       |
|  [ __________________________ ]  |
|                                  |
|  [ Cancelar horário ]            |
|  [ Voltar ]                      |
|                                  |
+----------------------------------+
```

Vale com menos de 2 horas, no passado ainda sem desfecho, ou no futuro. Sempre devolve o uso. Não gera comissão, porque comissão só sai de atendimento realizado.

O motivo interno não vai no WhatsApp. A mensagem é a de [10](10-mensagens-whatsapp.md): a casa cancelou, o uso voltou, o link de remarcar.

---

## G4 — Transferir

```
+----------------------------------+
|  Passar Carlos para              |
|                                  |
|  ( ) Barbeiro B · livre 15:00    |
|  ( ) Barbeiro C · livre 15:00    |
|                                  |
|  Mesmo dia e mesma hora.         |
|  O uso não muda.                 |
|  Carlos é avisado no WhatsApp.   |
|                                  |
|  [ Transferir ]                  |
|                                  |
+----------------------------------+
```

Quem não está livre naquele bloco não entra na lista. Não há transferência "mesmo ocupado".

---

## G5 — Equipe e jornada

```
+----------------------------------+
| Equipe                           |
|                                  |
|  Moura · admin e barbeiro        |
|  Barbeiro B · barbeiro           |
|  [ Adicionar ]                   |
|                                  |
+----------------------------------+
```

Adicionar pede nome, celular e o papel (barbeiro, admin, ou os dois). Esse celular passa a abrir a casca da equipe, não a de cliente. Se o número já era cliente, os papéis se somam na mesma conta.

Jornada de um barbeiro, editável:

```
+----------------------------------+
| <  Jornada · Barbeiro B          |
|                                  |
|  seg  [09:00] [19:00]  [on]      |
|       intervalo [13:00] [14:00]  |
|  ter  [09:00] [19:00]  [on]      |
|  qua  [09:00] [19:00]  [on]      |
|  qui  [09:00] [19:00]  [on]      |
|  sex  [09:00] [19:00]  [on]      |
|  sáb  [09:00] [17:00]  [on]      |
|  dom                      [off]  |
|                                  |
|  [ Salvar ]                      |
|                                  |
+----------------------------------+
```

Salvar não apaga horário já marcado que tenha ficado de fora. A tela lista esses horários e manda usar G3 ou G4 antes. A decisão não deixa a jornada nova engolir cliente marcado: o mesmo espírito do bloqueio, que só cabe em horário livre.

Bloqueios de todos, com desfazer:

```
+----------------------------------+
| Bloqueios                        |
|                                  |
|  Barbeiro B                      |
|  qua 14 · 14:00–16:00            |
|  consulta                        |
|  [ Desfazer ]                    |
|                                  |
+----------------------------------+
```

---

## N1 — Aviso de bloqueio

Dentro de Casa, um sino. Não é WhatsApp.

```
+----------------------------------+
| Avisos                           |
|                                  |
|  Barbeiro B bloqueou             |
|  qua 14 out, 14:00–16:00         |
|  consulta                        |
|  [ Ver ]     [ Desfazer ]        |
|                                  |
+----------------------------------+
```

---

## G6 — Serviços

```
+----------------------------------+
| Serviços                         |
|                                  |
|  Corte                           |
|  30 min · valor cheio R$ --      |
|                                  |
|  Barba                           |
|  30 min · valor cheio R$ --      |
|                                  |
|  Corte + barba                   |
|  50 min · valor cheio R$ --      |
|  duração própria, não a soma     |
|                                  |
|  [ Adicionar serviço ]           |
|                                  |
+----------------------------------+
```

Editar:

```
+----------------------------------+
|  Nome        [ Corte          ]  |
|  Duração     [ 30 ] minutos      |
|  Valor cheio [ R$             ]  |
|                                  |
|  A duração vale para todos       |
|  os barbeiros.                   |
|  A grade do cliente é de 30 min. |
|  Sobra de tempo fica ociosa.     |
|                                  |
|  [ Salvar ]                      |
|                                  |
+----------------------------------+
```

Valor cheio é a base da comissão e o que o cliente avulso vê na revisão. Mudar o valor não reescreve atendimento já fechado.

---

## G7 — Planos

Os três da [0022](../decisoes/0022-planos-barbearia-do-moura.md) já nascem cadastrados. A tela edita dados, não código ([0019](../decisoes/0019-um-codigo-varios-deploys-barbearia-id.md)).

```
+----------------------------------+
| <  GOLD LIMITADO                 |
|                                  |
|  Nome     [ GOLD LIMITADO     ]  |
|  Preço    [ R$ 179,90         ]  |
|  Usos     [ 4 ] por ciclo        |
|  Horários de plano ao mesmo tempo|
|           [ 4 ]                  |
|  Dias à frente                   |
|           [ 30 ]                 |
|                                  |
|  Serviços cobertos               |
|  [x] Corte                       |
|  [x] Barba                       |
|  [ ] Corte + barba               |
|                                  |
|  Dias cobertos                   |
|  [ ] seg  [x] ter  [x] qua       |
|  [ ] qui  [ ] sex  [ ] sáb       |
|  [ ] dom                         |
|                                  |
|  [ Salvar ]                      |
|                                  |
+----------------------------------+
```

Abaixo do preço, a frase fixa da tela, não um campo:

```
+----------------------------------+
|  No Pix Automático o valor fica  |
|  preso na autorização. Mudar o   |
|  preço pede nova autorização     |
|  de quem já assina no Pix.       |
|  Quem já é assinante não muda    |
|  de plano sozinho nesta versão.  |
|                                  |
+----------------------------------+
```

Salvar não altera o ciclo já pago de quem assinou. O novo preço vale para assinatura nova e para a próxima autorização. Quem está no cartão, na próxima cobrança, segue o que o gateway tiver aceitado; se a integração precisar recriar a assinatura, isso é trabalho de implementação, e a tela pelo menos não promete "mudou para todos agora".

---

## G8 — Regras da agenda

```
+----------------------------------+
| Agenda                           |
|                                  |
|  Antecedência mínima do cliente  |
|  [ 2 ] horas                     |
|                                  |
|  Grade                           |
|  [ 30 ] minutos                  |
|                                  |
|  A casa marca com menos tempo    |
|  e fora da grade.                |
|  O cliente, não.                 |
|                                  |
|  [ Salvar ]                      |
|                                  |
+----------------------------------+
```

Padrão de [0035](../decisoes/0035-antecedencia-minima-2h.md) e [0033](../decisoes/0033-duracao-dos-servicos-e-grade-30-min.md). Os dois são configuração da barbearia, para outro deploy poder usar outra grade.

---

## Casa, o menu

```
+----------------------------------+
| Casa                             |
|                                  |
|  Avisos                        > |
|  Clientes                      > |
|  Equipe e jornada              > |
|  Serviços                      > |
|  Planos                        > |
|  Agenda (antecedência e grade) > |
|  Financeiro                    > |
|  Eu                            > |
|                                  |
| Hoje   Agenda   Fechar   Casa    |
+----------------------------------+
```

`Financeiro` abre [09](09-admin-financeiro.md).
