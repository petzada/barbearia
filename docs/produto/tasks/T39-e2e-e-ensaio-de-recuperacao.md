# T39 — E2E completo em staging e ensaio de recuperação com conciliação

| Campo | Valor |
|---|---|
| Fase | 10 |
| Iniciar após | T38, T37, T36, T19, T26 |
| Concluir requer | — |
| Gate humano | **H06** parte 1 (retomar automações pós-restore) e parte 2 (aceite dos perfis) |
| Decisões | D0014, D0016, D0072 (exclusões após restore), D0078 |
| PRD | §7.7, §8.2, §8.4 |
| Área de escrita | `tests/e2e/**`, `docs/operacao/recuperacao.md`, `docs/operacao/uat.md` |
| Não tocar | Regras de negócio (falhas viram tarefas para as tasks donas) |
| Paralelizável com | — |

## Objetivo

Provar o MVP inteiro em staging, de ponta a ponta, nos três perfis, e provar que um restore de backup não duplica cobranças, mensagens ou cancelamentos nem perde pagamentos.

## Ler antes

PRD §7.7, §8.2, §8.4; runbooks de T36; [H06](../handoffs/H06-aceite-e-lancamento.md).

## Escopo

1. **Suíte E2E de jornadas** (Playwright, mobile e desktop, contra staging com provedores de teste quando possível e fakes onde a capacidade não existe):
   - cliente: onboarding → login → explorar → assinar (cartão e Pix) → agendar → lembrete → atendimento → cancelamento no prazo e tardio → remarcar → troca de plano → reajuste → cancelar assinatura (protocolo) → excluir conta (agendada);
   - barbeiro: instalar PWA → push → agenda → bloqueio → encaixe com pré-cadastro → desfecho e recebimento → inclusão de serviço → ganhos;
   - admin: CRM → transferência → cancelamento pela casa (crédito) → correção → fechamento → repasse parcial → financeiro → ocorrências → configurações;
   - jornada financeira fechada: cliente → reserva → atendimento → caixa → comissão → fechamento → repasse.
2. **Cenários críticos** do PRD §8.2 que dependem de integração, reexecutados em staging.
3. **Ensaio de recuperação** (`docs/operacao/recuperacao.md`):
   1. gerar backup do banco de staging (ponto P);
   2. depois de P, produzir efeitos: pagamento aprovado, pedido de cancelamento, mensagem enviada, exclusão concluída, devolução;
   3. restaurar o backup P num ambiente de ensaio;
   4. subir em **modo recuperação** (T03): efeitos externos e jobs pausados;
   5. rodar `reconciliation.runAll(desde = P)` (T22) e `privacy.reapplyAfterRestore()` (T35);
   6. comparar estado reconstruído com o esperado; registrar divergências;
   7. **🛑 parar (H06 parte 1)**: enviar o relatório e pedir autorização para retomar automações;
   8. com autorização: sair do modo recuperação, retomar jobs e verificar que nada foi duplicado (nenhuma segunda cobrança, mensagem repetida apenas se ainda devida, devolução única).
4. **UAT (H06 parte 2):** roteiro `docs/operacao/uat.md` por perfil, contas de teste preparadas, coleta de problemas; **🛑 parar** e pedir a execução/aceite ao humano; transformar problemas em tarefas P0–P3 para as tasks donas.

## Regras e checklist defensivo

- Nenhum dado real de cliente no staging (salvo autorização explícita).
- Divergência de conciliação nunca é "corrigida à mão" sem registro: vira ocorrência com resolução.

## Critérios de aceite

Suíte E2E verde (ou falhas com dono e prazo, nenhuma P0/P1); ensaio de recuperação com zero efeitos duplicados; H06 partes 1 e 2 registradas.

## 🛑 Handoffs humanos (H06)

- **Parte 1:** no passo 3.7 — **PARAR** com o relatório de conciliação; retomar só com "H06 parte 1 aprovada".
- **Parte 2:** depois da suíte E2E verde — **PARAR** e pedir o UAT; retomar só com "H06 parte 2 aprovada" e a lista de problemas.

## Entrega

Relatório (PRD §11.5) + documentos de recuperação e UAT.
