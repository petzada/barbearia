# Quadro de estado das tasks

Mantido pelo orquestrador. Atualizar a cada mudança de estado. Estados em [README.md](README.md#estados).

| ID | Task | Estado | Responsável / branch | Atualizado em | Observação (gate, bloqueio, parte entregue) |
|---|---|---|---|---|---|
| T00 | Kickoff e handoffs iniciais | done | Orquestrador | 2026-10-13 | Inventário: repositório sem commits e sem código de app (só docs/, reports/, research_notes/, .maestri/); nada diverge do plano. Links de PRD/tasks/handoffs verificados. Pedidos H01–H04 feitos. |
| T01 | Scaffold do repositório | done | Bigorna / main (7c38b78, 04ff6eb, fcc17d4) | 2026-10-13 | Sem Docker (D0082): Postgres Railway via proxy TCP, bancos barbearia_dev/_test. Revisão Navalha aprovada (após 1 reprovação); teste Espelho aprovado (após 1 reprovação: assets 404 no Node 22/Windows → servidor scripts/start-web.mjs + check:start no verify). P3 p/ T12: decidir servidor/adapter de deploy e validar em Linux. |
| T02 | Plataforma e contratos | done | Bigorna / main (c682c6c, ea32919) | 2026-10-13 | Revisão Navalha aprovada; teste Espelho aprovado (185 testes). Desvio técnico aceito: dispatcher único (src/platform/context/dispatcher.ts) no lugar de createServerFn por operação. Encaminhado: CSRF/Origin no endpoint único (T04); teste de segredo no bundle com controle positivo quando a 1ª rota usar o dispatcher (T04/T37); loadEnv no boot do web/worker (T03/T12); REVOKE/trigger de TRUNCATE em auditoria (T37); pontosBaseSchema 0–10000 vs reajuste >100% (T24); limpeza de chaves de idempotência (T03/T36). |
| T03 | Jobs, outbox, inbox | review | Bigorna→Tenaz / task/T03-jobs-outbox-inbox @ 2865dca | 2026-10-13 | 1ª revisão reprovada (Navalha: isolamento do worker, em_andamento sem reconciliação, prazo de parada do outbox); corrigido; re-revisão (Lince). |
| T04 | Identidade e acesso | running | Bigorna / task/T04-identidade-e-acesso (worktree barbearia-wt/T04, DB barbearia_t04_test) | 2026-10-13 | Inclui CSRF/Origin no dispatcher e teste de bundle com controle positivo (herdados do T02). Telas aguardam T05. |
| T05 | Shell de UI e PWA | done | Cinzel / task/T05-shell-ui-pwa @ f24d7b8 → main | 2026-10-13 | Revisão Lince aprovada; teste Espelho aprovado (307 testes, e2e 119). Pendências: UiSessionSource real (T04), setBrand (T08), setNotificationCount (T30); NODE_ENV do .env.local no build (T12). |
| T06 | Catálogo e equipe | running | Cinzel→Grampo / task/T06-catalogo-servicos-equipe @ b74658a (base T05) | 2026-10-13 | 1ª revisão reprovada (Navalha, 10 itens: parse de %, espelho avulso→assinante, auditoria da vigência, catálogo público via loader, nome fixo do banco, índice do Drizzle, revisão dos eventos, queries paralelas no tx, corrida combo×desativar, testes de autorização). Em correção (Grampo). |
| T07 | Planos e versões | todo | — | 2026-10-13 | — |
| T08 | Configuração, marca, R2 | todo | — | 2026-10-13 | — |
| T09 | Adapter WhatsMiau | running | Tenaz / task/T09-adapter-whatsmiau (base T03 2865dca; DB barbearia_t09_test) | 2026-10-13 | Iniciada sobre T03 em re-revisão. |
| T10 | Adapter Mercado Pago | todo | — | 2026-10-13 | — |
| T11 | Adapter Woovi | running | Cinzel / task/T11-adapter-woovi (base T03 2865dca; DB barbearia_t11_test) | 2026-10-13 | Iniciada sobre T03 em re-revisão. |
| T12 | CI e deploy | todo | — | 2026-10-13 | — |
| T13 | Motor de cotação | todo | — | 2026-10-13 | — |
| T14 | Agenda e disponibilidade | todo | — | 2026-10-13 | — |
| T15 | Direitos, usos, limites | todo | — | 2026-10-13 | H01 resolvido (D0083–D0087) |
| T16 | Assinatura e cobrança | todo | — | 2026-10-13 | H01 resolvido (D0083–D0087) |
| T17 | Reserva pelo cliente | todo | — | 2026-10-13 | — |
| T18 | Cancelar, remarcar, reposição | todo | — | 2026-10-13 | — |
| T19 | Agendamento pela equipe | todo | — | 2026-10-13 | INT-08 confirmada |
| T20 | Contratação e teto | todo | — | 2026-10-13 | H01 resolvido (D0083–D0087) |
| T21 | Inadimplência e escolhas | todo | — | 2026-10-13 | H01 resolvido (D0083–D0087) |
| T22 | Devoluções, reversões, conciliação | todo | — | 2026-10-13 | — |
| T23 | Cancelamento da assinatura | todo | — | 2026-10-13 | INT-07 confirmada |
| T24 | Troca, versão, reajuste | todo | — | 2026-10-13 | H01 resolvido (D0083–D0087) |
| T25 | Atendimento e recebimentos | todo | — | 2026-10-13 | — |
| T26 | Inclusão de serviço | todo | — | 2026-10-13 | H01 resolvido (D0083–D0087) |
| T27 | Comissões e extrato | todo | — | 2026-10-13 | — |
| T28 | Correções e ações de direito | todo | — | 2026-10-13 | H01 resolvido (D0083–D0087) |
| T29 | Fechamento e repasses | todo | — | 2026-10-13 | H01 resolvido (D0083–D0087) |
| T30 | Central e push | todo | — | 2026-10-13 | — |
| T31 | Mensagens e lembretes | todo | — | 2026-10-13 | — |
| T32 | Área do cliente | todo | — | 2026-10-13 | — |
| T33 | CRM, suporte, recuperação | todo | — | 2026-10-13 | Ativação depende de H03 |
| T34 | Painel, financeiro, Gestão | todo | — | 2026-10-13 | — |
| T35 | Privacidade e exclusão | todo | — | 2026-10-13 | Ativação depende de H03 |
| T36 | Observabilidade e runbooks | todo | — | 2026-10-13 | — |
| T37 | Segurança e permissões | todo | — | 2026-10-13 | — |
| T38 | Staging e homologação | todo | — | 2026-10-13 | Exige H02 |
| T39 | E2E e ensaio de recuperação | todo | — | 2026-10-13 | Exige H06 (parte 1 e 2) |
| T40 | Produção e go-live | todo | — | 2026-10-13 | Exige H03, H04, H05, H06 |

## Handoffs

| Gate | Estado | Pedido em | Respondido em | Observação |
|---|---|---|---|---|
| H00 | respondido | 2026-10-13 | 2026-10-13 | Sem Docker: Postgres Railway (D0082) |
| H01 | respondido | 2026-10-13 | 2026-10-13 | D0083–D0088 |
| H02 | parcial | 2026-10-13 | 2026-10-13 | Railway staging criado (web, worker, Postgres); domínio HTTPS em criação; demais contas sob demanda |
| H03 | pedido | 2026-10-13 | — | Adiado pelo humano |
| H04 | pedido | 2026-10-13 | — | Adiado pelo humano |
| H05 | não pedido | — | — | Pedir em T40 |
| H06 | não pedido | — | — | Pedir em T39/T40 |
| H07 | não pedido | — | — | Pós-MVP |
