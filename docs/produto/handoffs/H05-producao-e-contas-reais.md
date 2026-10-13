# H05 — Produção e contas reais

- **Pedido por:** T40, depois que T39 estiver aprovado.
- **Bloqueia:** deploy de produção, qualquer cobrança real e qualquer mensagem a cliente real.
- **Quem responde:** dono do produto (Railway, Woovi, WhatsMiau, domínio) e dono da barbearia (Mercado Pago de produção).

## Por que é necessário

D0030: em produção, o cartão recorrente usa a **conta Mercado Pago do dono da Barbearia do Moura**; o Pix Automático usa a **conta Woovi (CNPJ) do dono do produto com subconta da barbearia**, cadastrada manualmente. D0057: a troca de conta do Mercado Pago acontece **antes** de existir assinante real. D0014: backups configurados e restauração testada antes de dinheiro de cliente no banco.

## O que o agente prepara antes de pedir

- `docs/operacao/go-live.md` (T40): passo a passo, rollback, responsáveis.
- Lista de variáveis de produção (sem valores) e URLs de webhook/redirect de produção.
- Evidência de T39 (E2E e ensaio de recuperação aprovados).

## Checklist para o humano

**Infraestrutura**
- [ ] Projeto Railway `barbearia-moura-prod` com Postgres, `web` e `worker`; **backups ativados** (frequência e retenção definidas).
- [ ] Domínio definitivo e DNS apontados; HTTPS ativo.
- [ ] Bucket R2 de produção (privado) com CORS do domínio.

**Mercado Pago (conta do dono da barbearia)**
- [ ] Aplicação criada na conta do dono da barbearia; credenciais de **produção** inseridas nas variáveis do Railway.
- [ ] Webhooks de produção configurados com os mesmos tópicos homologados; segredo nas variáveis.
- [ ] Nome que aparece na fatura do cartão conferido.
- [ ] Confirmação: **nenhum assinante real** na conta de teste (D0057).

**Woovi (conta do dono do produto)**
- [ ] Subconta da Barbearia do Moura criada manualmente no painel.
- [ ] Credenciais de produção e webhook de produção configurados.
- [ ] Nome exibido ao pagador conferido (o app avisa na tela de Pix).

**WhatsMiau**
- [ ] Instância de produção (no piloto: o número de teste do dono do produto, D0031) pareada; perfil com nome e foto da Barbearia do Moura.
- [ ] Webhook de mensagens recebidas para produção.

**Outros**
- [ ] Google OAuth com redirect de produção.
- [ ] Chaves VAPID de produção (o agente gera; o humano guarda no Railway).
- [ ] Destinatários de alertas (quem recebe incidentes) e responsáveis de suporte.

## Como entregar

Tudo direto nos painéis e nas variáveis do Railway de produção. Responder "H05 pronto" com a lista do que foi feito.

## Critério de saída

Health check de produção verde; versão instalada registrada; webhooks de produção recebendo o evento de teste dos provedores; backup manual executado e listado; transação real controlada (T40) autorizada em H06.

## Se não houver resposta

Produção não sobe. O MVP fica pronto em staging, com a lista de configurações manuais pendentes.
