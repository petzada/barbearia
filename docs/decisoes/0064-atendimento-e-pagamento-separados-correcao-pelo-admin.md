# 0064 — Atendimento realizado e pagamento são estados separados; correção só pelo admin

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q19 e Q20
- **Substitui:** em [0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md), a confirmação do pagamento avulso como parte obrigatória do "realizado"

## Contexto
Um atendimento pode acontecer sem pagamento integral. Isso não pode ficar escondido nem gerar recebimento fictício. E corrigir um "realizado" que era "falta" mexe em uso, comissão e recebimento, não só no uso.

## Decisão

### Realizado × pagamento
- **Realizado** gera a comissão conforme a configuração ([0023](0023-comissao-por-barbeiro-e-servico.md)).
- O pagamento da parte avulsa tem estado próprio: **pendente**, **parcial** ou **quitado**, com a forma de pagamento. O financeiro reconhece como recebido **só o valor confirmado**, e o restante fica pendente.
- A **parte coberta** por assinatura regularizada **já está paga pela mensalidade**: realizado gera comissão, **sem nova cobrança** e **sem receita duplicada**.
- Em **visita mista**, só a parte avulsa exige confirmação de recebimento.

### Correção de atendimento
- **Só o admin** corrige um atendimento, com **motivo obrigatório** e **histórico preservado**, no backoffice ([0076](0076-central-de-notificacoes-e-gestao-no-desktop.md)).
- A correção gera **ajustes** de uso, comissão e recebimento, **sem apagar** lançamentos anteriores ([0067](0067-fechamento-ajuste-no-periodo-aberto-e-repasse-parcial.md)).
- Corrigir o registro de pagamento **não devolve dinheiro automaticamente**. Devolução real é tratada à parte.
- Se o desfecho correto for falta com penalidade, o uso **continua consumido**.
