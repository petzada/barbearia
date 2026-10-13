# 11 — Mapa dos fluxos

Visão única. O detalhe de cada caixa está no arquivo indicado.

## Entrar

```
link
 |
 +-- sessão de até 90 dias, renovada no uso --> app do papel
 |
 +-- celular --> código WhatsApp (5 min, 5 erros)
 |                 |
 |                 +-- novo --> nome --> avisos --> instalar --> cliente
 |                 +-- já existe --> cliente, ou equipe se o admin deu papel
 |                 +-- pré-cadastro --> "achamos você" --> mesmo destino
 |
 +-- Google --> telefone já ligado --> entra
                telefone novo --> o mesmo código --> liga na mesma conta
                WhatsApp fora e conta nova --> para e espera
```

Arquivo: [01-entrada-login-e-conta.md](01-entrada-login-e-conta.md).

## Cliente marca

```
Agendar
  |
  v
serviço(s)
  |
  v
barbeiro          (não há "qualquer um": a cadeira é escolhida)
  |
  v
dia
  |   assinante: só até 30 dias, e no máximo 4 horários de plano
  |   GOLD: terça e quarta cobrem; os outros dias seguem como avulso
  v
grade :00 e :30
  |   esconde horário com menos de 2h
  |   ocupa a soma das durações, arredondada à grade
  v
revisão
  |   coberto = 1 uso da visita, R$ 0 agora
  |   fora do dia ou serviço de fora = avulso, valor cheio, pago na casa
  |   regras de falta e de 2h escritas de novo
  v
confirmado --> WhatsApp, se aceitou avisos
```

Trava antes da revisão: sem uso no ciclo daquela data para a parte coberta; já tem 4 horários de plano; dia além de 30 dias. Avulso puro (sem parte coberta) não gasta uso e não entra na cota de 4.

Arquivo: [03-cliente-agendamento.md](03-cliente-agendamento.md).

## Cliente cancela horário

```
detalhe do horário
 |
 +-- mais de 2h --> confirma --> uso de plano volta, vaga abre
 |
 +-- menos de 2h --> sem botão
 |                    assinante: o uso será consumido se não vier
 |                    avulso: falta não tem custo
 |
 +-- a casa cancelou --> uso volta + WhatsApp com link de remarcar
 +-- a casa trocou o barbeiro --> aviso, uso permanece
```

Arquivo: [04-cliente-cancelamento.md](04-cliente-cancelamento.md).

## Plano

```
vitrine BLACK | GOLD LIMITADO | PREMIUM
  |
  v
regras na mesma tela (cota, dias, 4 horários, 30 dias, não acumula, falta)
  |
  +-- cartão (campo do Mercado Pago, não o nosso servidor)
  +-- Pix Automático (sai para o banco, volta, espera confirmação)
  v
ativo: usos do ciclo = intervalo entre cobranças
  |
  +-- cancelar no app
  |     para a próxima cobrança só quando o gateway confirma
  |     o que já foi pago vale até a data
  |     horário depois disso: cancela, ou a pessoa marca "manter e pagar na casa"
  |
  +-- recusa da renovação --> suspensa na hora
        horários guardados até 2h antes
        regularizar ou retentativa --> volta sozinho
        retentativas esgotadas --> cancelada no app e no gateway
        horário que já estava a menos de 2h: não cai sozinho;
        selo para o barbeiro; se não pagar, atende como avulso
```

Arquivos: [05-cliente-planos.md](05-cliente-planos.md), [06-cliente-inadimplencia.md](06-cliente-inadimplencia.md).

## Quem atende

```
Hoje / agenda
  |
  +-- bloquear só horário livre --> admin vê e pode desfazer
  |     horário ocupado --> pede ao admin
  |
  +-- encaixe, até fora da grade e com menos de 2h
  |     cliente da lista, ou nome + telefone (pré-cadastro)
  |     regras de plano iguais às do cliente
  |
  +-- horário passado sem desfecho
        realizado --> se houver avulso, escolhe dinheiro, Pix,
                      débito ou crédito da maquininha
                      dispara uso (se plano) e comissão
        falta do assinante --> consome uso, sinal no CRM, sem comissão
        falta do avulso --> sem custo e sem comissão
```

Jornada da semana: o barbeiro só vê. Quem edita é o admin.

Arquivos: [07-barbeiro.md](07-barbeiro.md), [08-admin-casa.md](08-admin-casa.md).

## Admin, além da cadeira

```
Casa
  +-- clientes (plano, pagamentos, faltas, histórico)
  +-- cancelar horário de cliente (uso volta, WhatsApp)
  +-- transferir para outro barbeiro (WhatsApp)
  +-- jornada e bloqueios de todos
  +-- serviços: duração única e valor cheio
  +-- planos: cobertura, dias, usos, preço, teto de horários, janela
  +-- antecedência mínima (padrão 2h) e grade (padrão 30 min)
  +-- financeiro: assinaturas dos gateways + avulso por forma
  +-- comissão: barbeiro x serviço, % avulso e % assinante
  +-- repasse: o sistema soma; o admin paga por fora e marca pago
```

Arquivos: [08-admin-casa.md](08-admin-casa.md), [09-admin-financeiro.md](09-admin-financeiro.md).

## Mensagens

```
número de códigos (no piloto, o mesmo dos avisos)
  +-- 6 dígitos, 5 minutos

número de avisos, só com aceite
  +-- marcado, lembrete, casa cancelou, casa trocou barbeiro
  +-- plano ativo, cancelado, suspenso, horário derrubado, plano de volta
```

Arquivo: [10-mensagens-whatsapp.md](10-mensagens-whatsapp.md).
