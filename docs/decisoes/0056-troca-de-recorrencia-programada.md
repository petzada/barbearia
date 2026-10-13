# 0056 — Troca de recorrência programada para a próxima renovação

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q41
- **Detalha:** [0039](0039-troca-de-plano-no-proximo-ciclo.md), [0042](0042-reajuste-de-plano-para-todos-com-30-dias.md), [0050](0050-pix-sem-nova-autorizacao.md)

## Contexto
Confirmar a nova autorização antes da hora não define quando cobrar. Cancelar a recorrência antiga ou iniciar a nova sem coordenar com a renovação pode deixar um buraco sem cobrança ou gerar duas cobranças no mesmo ciclo.

## Decisão
- A substituição da recorrência (troca de plano ou reajuste) é **programada para a próxima renovação**, preservando o ciclo atual.
- Existe **uma única recorrência responsável** pela cobrança seguinte. O app **impede duas cobranças pelo mesmo ciclo**.
- A troca só aparece como **pronta** depois que o provedor **confirma a programação**. Falha vira **pendência visível**, nunca sucesso indevido.

## Consequências
- **A verificar nos provedores:** como programar a nova recorrência e encerrar a antiga na virada do ciclo (Mercado Pago: alteração de valor da assinatura; Woovi: nova autorização Pix Automático).
