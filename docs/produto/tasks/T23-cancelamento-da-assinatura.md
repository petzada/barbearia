# T23 — Cancelamento da assinatura com protocolo

> **Atualização 2026-10-13:** INT-07 confirmada → [D0088](../../decisoes/0088-interpretacoes-int-01-a-13-confirmadas.md).

| Campo | Valor |
|---|---|
| Fase | 7 |
| Iniciar após | T21, T22 |
| Concluir requer | — |
| Gate humano | Confirmação da INT-07 no H01 (não bloqueia a construção) |
| Decisões | D0021, D0040, D0053, D0055, D0061 (vaga até o fim), D0063, D0072 |
| PRD | RN08, §5.15 (INT-07), §4.3 (C05, D02) |
| Área de escrita | `src/modules/subscriptions/cancellation/**`, rotas `src/routes/app/plano/cancelar/**`, ação em `src/routes/admin/clientes/$id/**` (só o componente de cancelar) |
| Não tocar | Núcleo (T16), devoluções (T22) |
| Paralelizável com | T24, T28, T29 |

## Objetivo

Cancelar é um botão do cliente, com efeito no provedor e um protocolo imediato. A tela é honesta: mostra "registrado, aguardando confirmação" até o provedor confirmar; o benefício pago vale até o fim; qualquer cobrança de ciclo iniciado depois do pedido é devolvida.

## Ler antes

PRD RN08, INT-07; D0021, D0055; pesquisa 20 (reclamações de cancelamento).

## Escopo

1. **Pedido:** `pedidos_cancelamento` (assinatura, protocolo legível e único, solicitado_em, solicitante `cliente`/`admin`/`exclusao_conta`, canal, motivo, estado `registrado`/`confirmado`/`escalado`, operação externa).
2. **Comando `cancellation.request`** (cliente dono; admin com motivo e auth recente; T35 para exclusão): na mesma transação → protocolo, `renovacao_habilitada = false`, estado `cancelada_no_fim_do_ciclo` (ou `cancelada` se `suspensa`/sem ciclo pago), operação externa de cancelamento no provedor, auditoria, eventos. Idempotente: segundo pedido devolve o mesmo protocolo.
3. **Reservas de plano depois do fim do ciclo (INT-07):**
   - cliente: no próprio fluxo, antes de confirmar, a tela lista essas reservas e o cliente escolhe por reserva: **manter como avulso** (preço da cotação e aceite) ou **cancelar** (sem penalidade); o pedido só é confirmado com todas escolhidas;
   - admin ou exclusão de conta: as reservas ficam com escolha de cobertura `encerramento` aberta (T21).
4. **Confirmação externa:** retentativas (política de T03) até o provedor confirmar → estado `confirmado`, aviso ao cliente com protocolo; falha persistente → `escalado` + pendência do admin; a reconciliação (T22) continua tentando.
5. **Cancelamento iniciado fora do app** (app do Mercado Pago, banco no Pix): `ProviderRecurringStatusChanged(cancelada pelo pagador)` → criar pedido com solicitante `pagador_no_provedor`, mesmo fluxo (benefício até o fim; reservas futuras com escolha aberta).
6. **Fim do ciclo:** T16 move para `cancelada`; vaga liberada (T20); assinatura encerrada.
7. **Cobranças posteriores:** garantidas por T16 (`pos_cancelamento`) + T22 (devolução); esta task cobre o teste de ponta a ponta.
8. **Telas:** C05 "Cancelar assinatura" (consequências: data do fim do benefício, usos restantes, reservas afetadas, sem multa) → protocolo exibido e copiável → estado pendente/confirmado; D02 ação do admin com motivo.

## Fora do escopo

Exclusão de conta (T35 usa o comando), devolução (T22).

## Contratos (publica)

`cancellation.request/status`, eventos `SubscriptionCancellationRequested|Confirmed|Escalated`.

## Regras e checklist defensivo

- Instante do pedido é imutável e é o que vale para devolução.
- Nunca mostrar "cancelado" antes da confirmação do provedor; mostrar "solicitação registrada" com protocolo.
- O pedido não depende de o provedor estar no ar.

## Testes obrigatórios

- Provedor fora do ar: protocolo imediato, estado pendente, retentativas, escalonamento.
- Cobrança de renovação que chega depois do pedido → devolvida, sem ciclo, sem usos.
- Benefício segue até o fim; no fim, `cancelada` e vaga liberada.
- Reservas depois do fim: escolha por reserva no fluxo do cliente; abertas no fluxo do admin.
- Cancelamento feito no provedor reflete no app.
- Pedido duplicado → mesmo protocolo.
- E2E: cliente cancela pelo celular e vê o protocolo.

## Observação de handoff

INT-07 é interpretação adotada. Se o H01 rejeitá-la, ajustar o passo 3 (mudança localizada em `cancellation/affected-reservations.ts`).

## Entrega

Relatório (PRD §11.5).
