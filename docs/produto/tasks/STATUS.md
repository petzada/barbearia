# Quadro de estado das tasks

Mantido pelo orquestrador. Atualizar a cada mudança de estado. Estados em [README.md](README.md#estados).

| ID | Task | Estado | Responsável / branch | Atualizado em | Observação (gate, bloqueio, parte entregue) |
|---|---|---|---|---|---|
| T00 | Kickoff e handoffs iniciais | done | Orquestrador | 2026-10-13 | Inventário: repositório sem commits e sem código de app (só docs/, reports/, research_notes/, .maestri/); nada diverge do plano. Links de PRD/tasks/handoffs verificados. Pedidos H01–H04 feitos. |
| T01 | Scaffold do repositório | ready | — | 2026-10-13 | H00 respondido (D0082): sem Docker, Postgres Railway em bancos _dev/_test |
| T02 | Plataforma e contratos | todo | — | 2026-10-13 | — |
| T03 | Jobs, outbox, inbox | todo | — | 2026-10-13 | — |
| T04 | Identidade e acesso | todo | — | 2026-10-13 | — |
| T05 | Shell de UI e PWA | todo | — | 2026-10-13 | — |
| T06 | Catálogo e equipe | todo | — | 2026-10-13 | — |
| T07 | Planos e versões | todo | — | 2026-10-13 | — |
| T08 | Configuração, marca, R2 | todo | — | 2026-10-13 | — |
| T09 | Adapter WhatsMiau | todo | — | 2026-10-13 | — |
| T10 | Adapter Mercado Pago | todo | — | 2026-10-13 | — |
| T11 | Adapter Woovi | todo | — | 2026-10-13 | — |
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
