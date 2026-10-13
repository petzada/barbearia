# T21 — Inadimplência, regularização e escolhas de cobertura

> **Atualização 2026-10-13:** H01-Q4 respondido → [D0086](../../decisoes/0086-regularizacao-de-mensalidade.md).

| Campo | Valor |
|---|---|
| Fase | 6 |
| Iniciar após | T16, T18 |
| Concluir requer | — |
| Gate humano | **H01-Q4** (ramo: meio de regularização manual) |
| Decisões | D0018, D0026, D0052, D0053, D0054 (reservas), D0063 |
| PRD | RN07, RN14, §5.15 (INT-05), §4.3 (C03, C05, B03) |
| Área de escrita | `src/modules/subscriptions/delinquency/**`, `src/modules/scheduling/coverage-choices/**`, rotas `src/routes/app/reservas/$id/escolha/**`, `src/routes/app/plano/regularizar/**`, componente de concordância de balcão em `src/routes/equipe/atendimentos/**` (só o componente) |
| Não tocar | Núcleo de assinatura (T16), desfecho (T25) |
| Paralelizável com | T26, T27 |

## Objetivo

Quando a cobertura de uma reserva some (inadimplência, encerramento, reversão, deslocamento de ciclo, troca não efetivada), o cliente decide explicitamente o que fazer; nada é cobrado nem cancelado em silêncio. E o cliente consegue regularizar a assinatura.

## Ler antes

PRD RN07, RN14; D0053, D0063; eventos de T15/T16.

## Escopo

1. **Mecanismo genérico de escolha de cobertura** (`coverage-choices`): `escolhas_cobertura` (reserva, causa `inadimplencia`/`encerramento`/`reversao`/`deslocamento_ciclo`/`troca_plano`/`troca_nao_efetivada`/`migracao_versao`, cotação avulsa proposta com hash, estado `aberta`/`resolvida`/`obsoleta`, opção escolhida, canal, registrador). Abertura idempotente por (reserva, causa). API usada por T22, T23 e T24.
   - Opções: **regularizar** (só quando a causa permite), **manter como avulso** (aceite com hash da cotação avulsa), **cancelar sem penalidade** (`reservations.cancelByClient` com motivo `perda_de_cobertura`, sem consumo e sem tardio).
   - Escolha obsoleta quando a cobertura volta (ex.: regularização) → fecha automaticamente com motivo.
   - **Concordância no balcão:** a equipe registra a escolha na tela de atendimento (B03) antes do serviço; sem escolha registrada, o atendimento mostra o alerta e o botão "registrar concordância".
2. **Handlers:**
   - `ChargeRefusedBeforeEnd` → aviso (T31) + pendência do cliente; **sem** suspensão.
   - `SubscriptionSuspended` → para cada reserva futura com alocação que perdeu cobertura: alocação → liberada/prevista conforme T15, escolha `inadimplencia` aberta, aviso; reservas continuam ocupando limites.
   - `SubscriptionEnded` (retentativas esgotadas, admin) → escolha `encerramento` nas reservas futuras.
   - `CycleStartedLate` → recálculo: reservas que voltam a caber ficam cobertas e escolhas obsoletas; excedentes seguem `CoverageLost` (T15, H01-Q2).
   - `CoverageLost` → escolha `deslocamento_ciclo`.
3. **Falta durante suspensão:** garantir com T15 que não consome uso e gerar sinalização ao admin (evento para T33/T30).
4. **Regularizar (C05):** mostrar obrigação em aberto, valor, meio atual e estado das retentativas; ação depende do ramo H01-Q4; sempre disponível: "atualizar cartão" (T10) ou "reautorizar Pix" (T11) quando o provedor exigir.
5. **Telas:** C03 banner/fluxo de escolha (três opções com consequências e preço); lista de pendências do cliente (para T32); componente de concordância de balcão (para T25).

## Fora do escopo

Reversões e devoluções (T22), cancelamento voluntário (T23), troca de plano (T24) — eles usam o mecanismo daqui.

## Contratos (publica)

`coverageChoices.open/resolve/obsolete/listForClient/listForReservation`, eventos `CoverageChoiceOpened|Resolved`, `delinquency.regularizationOptions`.

## Regras e checklist defensivo

- Nenhum job cria aceite ou cancela reserva por inadimplência (D0053).
- Aceite de avulso exige hash igual ao da cotação vigente; cotação mudou → nova escolha.
- Cancelar sem penalidade nunca consome uso nem conta como tardio.

## Testes obrigatórios

- Recusa antes do fim: sem suspensão, aviso enviado, pendência criada.
- Suspensão no fim: reservas mantidas, escolhas abertas, limites continuam contando.
- Cliente escolhe avulso (aceite gravado), cancelar (sem penalidade) ou regulariza (escolhas obsoletas).
- Sem escolha até o atendimento: equipe registra concordância de balcão com canal e registrador.
- Falta na suspensão: sem consumo, sinalizada.
- Pagamento atrasado: reservas recalculadas; excedente abre escolha.

## 🛑 Handoff humano (H01-Q4)

O botão **regularizar** com pagamento imediato (cobrança Pix ligada à obrigação, nova tentativa no cartão, ou registro manual) depende de H01-Q4 e das capacidades provadas em T38.

- **Respondida e capacidade provada:** implementar a opção.
- **Caso contrário:** **PARAR este ramo**. A tela mostra "aguarde a nova tentativa automática" e as ações de atualizar cartão/reautorizar Pix; marcar `blocked_human (H01-Q4)` com o restante entregue e enviar a mensagem padrão.

## Critérios de aceite

Mecanismo de escolha usado por pelo menos dois gatilhos em testes de integração; telas do cliente e componente de balcão funcionais.

## Entrega

Relatório (PRD §11.5).
