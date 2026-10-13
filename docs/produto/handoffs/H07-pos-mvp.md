# H07 — Pós-MVP: números, contas e replicação

- **Pedido por:** decisão futura do dono do produto, depois do piloto validado.
- **Bloqueia:** nada do MVP.

## Situações cobertas

1. **Dois números WhatsApp dedicados** (D0010, D0031): um só para códigos, outro para avisos. O código já nasce com as duas configurações; a troca é de variáveis. Pedir: plano Pro do WhatsMiau, dois números pareados, perfis com nome e foto.
2. **Woovi própria da barbearia** ou outra mudança de conta de pagamento (D0057): exige migração validada. Pedir: conta nova, prova em sandbox de que as autorizações migram ou plano de novas autorizações sem cobrança dupla, janela de transição.
3. **Replicação para 3–5 barbearias** (D0012, D0019, D0078): um deploy e um banco por loja; liberação teste → Moura → demais. Pedir por loja: H02, H04 e H05 próprios; decisão sobre o modelo de subconta Woovi (D0030).

## Regra

Ao acontecer qualquer item, abrir um handoff específico (cópia deste com os dados da situação), parar o ramo e seguir as regras de [README.md](README.md).
