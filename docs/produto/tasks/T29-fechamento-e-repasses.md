# T29 — Fechamento mensal de comissões e repasses manuais

> **Atualização 2026-10-13:** H01-Q6 respondido → [D0087](../../decisoes/0087-devolucao-de-uso-e-comissao-negativa.md).

| Campo | Valor |
|---|---|
| Fase | 7 |
| Iniciar após | T27 |
| Concluir requer | — |
| Gate humano | **H01-Q6** (ramo: saldo negativo após correção) |
| Decisões | D0009, D0041, D0067, D0071 |
| PRD | RN11 (fechamento, repasse), §4.3 (D09, B04-status) |
| Área de escrita | `src/modules/commissions/{closing,payouts}/**`, rotas `src/routes/admin/comissoes/**` |
| Não tocar | Lançamentos (T27) |
| Paralelizável com | T23, T24, T28 |

## Objetivo

O admin fecha o mês com segurança (alerta de pendências, totais congelados), registra os repasses feitos por fora, inclusive em parcelas, e todos veem devido, pago e saldo.

## Ler antes

PRD RN11; D0009, D0041, D0067.

## Escopo

1. **Fechar período** (`closing.close`, admin, desktop, auth recente): prévia com total por barbeiro e **alerta** de atendimentos do mês sem desfecho (lista com links); confirmar fecha o período com lock; congela `fechamentos` (barbeiro, período, total devido, lista de lançamentos incluídos/hash). Estado `fechado`.
2. **Repasses** (`payouts.record`, admin, auth recente): barbeiro, período, valor > 0, data, observação; rejeitar acima do saldo (`COMMISSIONS.PAYOUT_EXCEEDS_BALANCE`); estorno de repasse = registro negativo com motivo. Estado do período: `parcialmente_pago` ou `quitado` (quando os repasses cobrem o devido de todos os barbeiros); status por barbeiro também.
3. **Ajustes posteriores** chegam por T27 no primeiro período aberto; o período fechado nunca muda.
4. **Tela D09:** lista de períodos com status; detalhe por barbeiro (devido, pago, saldo, lançamentos, ajustes com origem); fechar; registrar repasse.
5. **B04 (barbeiro):** status do período e repasses recebidos (leitura).

## Fora do escopo

Pagamento real (fora do app, D0009).

## Contratos (publica)

`closing.preview/close`, `payouts.record/reverse`, `commissions.periodStatus`, eventos `PeriodClosed`, `PayoutRecorded`.

## Regras e checklist defensivo

- Fechar duas vezes → idempotente.
- Lançamento chegando durante o fechamento → serializado pelo lock do período (ou entra no fechado antes do lock, ou vai para o próximo aberto).
- Repasse nunca debita automaticamente o barbeiro.

## Testes obrigatórios

- Fechar com pendências mostra alerta (não bloqueia).
- Atendimento confirmado depois do fechamento → próximo aberto.
- Repasses parciais → `parcialmente_pago`; cobertura total → `quitado`.
- Repasse acima do saldo rejeitado.
- Concorrência: lançamento × fechamento.

## 🛑 Handoff humano (H01-Q6)

Antes de tratar **período com total negativo** (correção depois de repasse), verificar H01-Q6.

- **Respondida:** implementar a opção (carregar, acertar fora com motivo ou informativo).
- **Não respondida:** **PARAR este ramo**: o fechamento de um período com total negativo para algum barbeiro é recusado com `COMMISSIONS.NEGATIVE_BALANCE_PENDING_H01`, exibindo o valor e a origem; marcar `blocked_human (H01-Q6)` e enviar a mensagem padrão. Períodos sem saldo negativo fecham normalmente.

## Critérios de aceite

D09 completo; status corretos; testes de concorrência verdes.

## Entrega

Relatório (PRD §11.5).
