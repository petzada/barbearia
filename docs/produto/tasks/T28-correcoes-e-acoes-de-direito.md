# T28 — Correções de atendimento e ações do admin sobre usos

> **Atualização 2026-10-13:** H01-Q5 respondido → [D0087](../../decisoes/0087-devolucao-de-uso-e-comissao-negativa.md).

| Campo | Valor |
|---|---|
| Fase | 7 |
| Iniciar após | T27, T15 |
| Concluir requer | T29 (para testar correção sobre período fechado/pago) |
| Gate humano | **H01-Q5** (ramo: devolução de uso de ciclo encerrado) |
| Decisões | D0040, D0047 (correção não vai ao mobile), D0060 (cortesia não amplia limite), D0064, D0067, D0071, D0076 |
| PRD | RN11 (correção, conceder/devolver uso), §4.4, §4.3 (D10, D02-ações de uso) |
| Área de escrita | `src/modules/attendance/corrections/**`, `src/modules/entitlements/admin-actions/**`, rotas `src/routes/admin/correcoes/**`, componente de usos em `src/routes/admin/clientes/$id/**` |
| Não tocar | Lançamentos (usa `postAdjustment` de T27), recebimentos (usa API de T25) |
| Paralelizável com | T23, T24, T29 |

## Objetivo

O admin corrige erros com segurança: muda um desfecho e vê, antes de confirmar, os efeitos em uso, comissão e recebimento; tudo é aplicado de uma vez com histórico, sem apagar nada e sem mexer em dinheiro de verdade. Também concede uso extra e devolve uso consumido com motivo.

## Ler antes

PRD RN11, §4.4; D0040, D0064, D0076.

## Escopo

1. **Correção de desfecho** (`corrections.preview` e `corrections.apply`, admin, desktop, auth recente, motivo obrigatório, `expectedRevision`):
   - realizado → falta: comissão estornada por ajuste negativo (T27, primeiro período aberto); uso continua consumido (falta com penalidade, D0064); conta a receber do avulso cancelada com motivo (recebimentos já feitos **não** são devolvidos: ficam como crédito a tratar e geram pendência "devolução real a decidir");
   - falta → realizado: comissão gerada (data do atendimento); uso já consumido (sem novo desconto); conta a receber criada;
   - falta/realizado → cancelamento pela casa (erro de registro): ajustes compensatórios + crédito de reposição se pago (T15);
   - prévia mostra antes/depois e cada efeito; aplicação numa transação; `correcoes_atendimento` com antes, depois, efeitos, motivo, admin.
2. **Conceder uso extra (cortesia)** (`entitlements.grantCourtesy` de T15 + tela): motivo obrigatório, ciclo vigente, não altera limites, sem efeito em comissão ou gateway.
3. **Devolver uso consumido** (`entitlements.adminReturn`): motivo obrigatório; ramo H01-Q5 para ciclo encerrado.
4. **Telas:** D10 (busca de atendimento, prévia de correção, confirmação com reautenticação se preciso); em D02, bloco "Usos" com histórico, conceder e devolver. No mobile, essas ações **não** aparecem (mensagem "disponível no computador").

## Fora do escopo

Devolução de dinheiro real (processo fora do app ou T22 para assinatura).

## Contratos (publica)

`corrections.preview/apply`, `entitlements.adminActions`, eventos `AttendanceCorrected`, `CourtesyGranted`, `UsageReturned`.

## Regras e checklist defensivo

- Sem auth recente → `AUTH.RECENT_REQUIRED` e fluxo de reautenticação.
- Corrigir duas vezes o mesmo atendimento exige `expectedRevision` atualizado.
- Nada é apagado: só novos registros.

## Testes obrigatórios

- Realizado → falta com período original fechado e pago: ajuste negativo no primeiro aberto, uso segue consumido, recebimento não devolvido + pendência.
- Falta → realizado: uma comissão, nenhum segundo consumo.
- Cortesia: saldo +1, limite de reservas inalterado.
- Devolução no ciclo vigente restaura o saldo.
- Barbeiro tentando corrigir → `AUTH.FORBIDDEN`; admin sem auth recente → reautenticação.

## 🛑 Handoff humano (H01-Q5)

Antes de permitir **devolver uso de um ciclo já encerrado**, verificar H01-Q5.

- **Respondida:** implementar a opção.
- **Não respondida:** **PARAR este ramo**: a devolução fica restrita a ciclos vigentes e, para encerrados, a tela mostra `ENTITLEMENTS.RETURN_PENDING_H01` sugerindo "conceder uso extra"; marcar `blocked_human (H01-Q5)` e enviar a mensagem padrão.

## Critérios de aceite

D10 e ações de uso funcionais no desktop; efeitos provados por testes.

## Entrega

Relatório (PRD §11.5).
