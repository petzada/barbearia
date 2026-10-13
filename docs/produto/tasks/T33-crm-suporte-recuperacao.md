# T33 — CRM de clientes, suporte e recuperação assistida

| Campo | Valor |
|---|---|
| Fase | 8 |
| Iniciar após | T16, T25, T28 |
| Concluir requer | — |
| Gate humano | **H03** (ativar recuperação assistida) |
| Decisões | D0020, D0024/D0025 (sinalização de falta), D0040, D0070, D0071 |
| PRD | RN01 (recuperação), §4.3 (D02, D12, A03), §9.1, §9.2 |
| Área de escrita | `src/modules/crm/**`, `src/modules/identity/recovery/**`, rotas `src/routes/admin/clientes/**` (exceto componentes de T23/T24/T28), `src/routes/admin/suporte/**`, `src/routes/(publico)/nao-consigo-entrar/**`, `docs/operacao/recuperacao-assistida.md` |
| Não tocar | Comandos de assinatura e correção (usa os componentes das tasks donas) |
| Paralelizável com | T32, T34, T35 |

## Objetivo

Dar ao admin a ficha completa de cada cliente para gerir assinaturas e entender histórico, e um suporte investigável: casos com protocolo, linha do tempo técnica por `correlationId` e recuperação de conta sem transferir histórico por mera posse do número.

## Ler antes

PRD RN01, §4.3, §9.1–§9.2; D0020, D0040, D0070; [H03](../handoffs/H03-identidade-e-privacidade.md).

## Escopo

1. **CRM (D02):** lista com busca (nome, telefone), filtros (plano, estado da assinatura, suspensos, com faltas recentes, pré-cadastrados, exclusão agendada), paginação; ficha com: dados, assinatura e versão, ciclos e saldos, reservas, atendimentos e faltas (sinalizações), pagamentos e devoluções, aceites (com canal e registrador), pedidos de cancelamento e protocolos, histórico de ações do admin (motivo, quem, quando). Ações embutidas: cancelar assinatura (T23), agendar troca (T24), conceder/devolver uso (T28).
2. **Leitura sensível auditada:** abrir a ficha completa registra auditoria de leitura.
3. **Suporte (D12):** `casos_suporte` (protocolo, tipo, cliente opcional, descrição, estado, responsável, linha do tempo); visão técnica por `correlationId`/protocolo juntando auditoria, eventos do agregado, inbox, operações externas e entregas; modelos de resposta construtiva (PRD §9.2).
4. **"Não consigo entrar" (A03, público):** explica a conferência assistida na barbearia, gera protocolo e orienta; nunca revela se o número existe.
5. **Recuperação assistida** (`casos_recuperacao`): admin no desktop com auth recente abre o caso; checklist do procedimento (texto vindo de `docs/operacao/recuperacao-assistida.md` aprovado no H03); registra método, evidências descritas (não copiar documentos), conclusão e motivo; verifica o novo WhatsApp por OTP; troca o vínculo; revoga sessões antigas; auditoria completa. Casos de número reciclado ou já vinculado a outra conta ativa: nunca automáticos; exigem caso.
6. **Rascunho do procedimento** em `docs/operacao/recuperacao-assistida.md` (passos, o que nunca revelar, evidências aceitas, casos especiais, quem pode executar) — insumo do H03.

## Fora do escopo

Painel e financeiro (T34), exclusão (T35).

## Contratos (publica)

`crm.search/getProfile`, `support.cases`, `recovery.open/complete`, flag `recuperacao_assistida_ativa`.

## Regras e checklist defensivo

- CRM é só admin; barbeiro nunca acessa.
- Busca por telefone exige número completo normalizado (sem busca parcial que facilite enumeração).
- Recuperação sem flag ativa → `IDENTITY.RECOVERY_DISABLED`.

## Testes obrigatórios

- Ficha mostra dados consistentes com fixtures de todos os estados.
- Barbeiro → 403 em qualquer rota do CRM.
- Recuperação: sem auth recente bloqueia; conclusão troca vínculo, revoga sessões antigas e audita; número de outra conta ativa → caso exige resolução manual explícita.
- A03 com número inexistente e existente produzem a mesma resposta.

## 🛑 Handoff humano (H03)

A recuperação assistida fica atrás da flag `recuperacao_assistida_ativa`, **desligada**. Ao terminar o rascunho do procedimento: **PARAR** antes de ligar a flag em qualquer ambiente com dados reais, marcar a parte "ativação" como `blocked_human (H03)`, e enviar a mensagem padrão pedindo a aprovação do procedimento e a lista de quem pode executá-lo. O restante da task (CRM, suporte, A03) é entregue normalmente.

## Critérios de aceite

D02, D12 e A03 funcionais; recuperação implementada e testada com a flag ligada em teste.

## Entrega

Relatório (PRD §11.5).
