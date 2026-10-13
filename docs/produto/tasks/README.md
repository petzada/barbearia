# Tasks de construção do MVP

Cada arquivo `Txx-*.md` é uma unidade de delegação para um subagente: escopo estreito, área de escrita própria, contratos declarados, testes obrigatórios, critérios de aceite e, quando houver, o ponto exato de **parada para handoff humano**.

- Plano, DAG e protocolo do orquestrador: [PRD §11](../PRD-MVP.md#11-plano-de-construção).
- Estado atual de cada task: [STATUS.md](STATUS.md).
- Handoffs humanos: [../handoffs](../handoffs/README.md).

## Lista

| ID | Task | Iniciar após | Concluir requer | Gate |
|---|---|---|---|---|
| [T00](T00-kickoff-e-handoffs-iniciais.md) | Kickoff do orquestrador e handoffs iniciais | — | — | abre H01–H04 |
| [T01](T01-scaffold-do-repositorio.md) | Scaffold do repositório e toolchain | T00 | — | H00 |
| [T02](T02-plataforma-e-contratos.md) | Plataforma núcleo e contratos | T01 | — | — |
| [T03](T03-jobs-outbox-inbox.md) | Durabilidade: jobs, outbox, inbox, operações externas, recuperação | T02 | — | — |
| [T04](T04-identidade-e-acesso.md) | Identidade, login, papéis, sessão e auth recente | T02 | T05 | — |
| [T05](T05-shell-ui-pwa.md) | Shell de UI, design system, PWA e boas-vindas | T02 | — | — |
| [T06](T06-catalogo-servicos-equipe.md) | Catálogo: serviços, combos, barbeiros e matriz | T02 | T04, T05 | — |
| [T07](T07-planos-e-versoes.md) | Planos, versões, preços e teto | T06 | T05 | — |
| [T08](T08-configuracao-marca-arquivos.md) | Configuração, marca, parâmetros e arquivos R2 | T03 | T04, T05 | — |
| [T09](T09-adapter-whatsmiau.md) | Adapter WhatsMiau e webhook de entrada | T03 | — | — |
| [T10](T10-adapter-mercado-pago.md) | Adapter Mercado Pago (cartão recorrente) | T03 | T05 | — |
| [T11](T11-adapter-woovi.md) | Adapter Woovi (Pix Automático) | T03 | — | — |
| [T12](T12-ci-e-pipeline-de-deploy.md) | CI, build, deploy, health e versão | T03 | — | — |
| [T13](T13-motor-de-cotacao.md) | Motor de cotação e cobertura | T07 | — | — |
| [T14](T14-agenda-e-disponibilidade.md) | Agenda: jornada, bloqueio, ocupação e disponibilidade | T06, T03 | T05 | — |
| [T15](T15-direitos-usos-limites.md) | Ledger de direitos: usos, alocações, limites e créditos | T07, T03 | — | H01-Q2 (ramo) |
| [T16](T16-assinatura-e-cobranca.md) | Núcleo de assinatura, obrigações, ciclos e pagamentos | T15 | — | H01-Q4 (ramo) |
| [T17](T17-reserva-pelo-cliente.md) | Reserva pelo cliente | T13, T14, T15 | T04, T05 | — |
| [T18](T18-cancelar-remarcar-reposicao.md) | Cancelar, remarcar, casa, transferência e crédito | T17 | — | — |
| [T19](T19-agendamento-pela-equipe.md) | Agendamento pela equipe, encaixe e pré-cadastro | T17 | T04 | H01 INT-08 |
| [T20](T20-contratacao-e-teto.md) | Contratação: checkout, vaga e teto | T16, T10, T11 | T05 | H01-Q3 (ramo) |
| [T21](T21-inadimplencia-e-escolhas.md) | Inadimplência, regularização e escolhas de cobertura | T16, T18 | — | H01-Q4 (ramo) |
| [T22](T22-devolucoes-reversoes-conciliacao.md) | Devoluções, reversões, contestações e conciliação | T16 | — | — |
| [T23](T23-cancelamento-da-assinatura.md) | Cancelamento da assinatura com protocolo | T21, T22 | — | H01 INT-07 |
| [T24](T24-troca-versao-reajuste.md) | Troca de plano, migração de versão, reajuste e recorrência | T21, T22 | T07 | H01-Q3 (ramo) |
| [T25](T25-atendimento-e-recebimentos.md) | Atendimento: desfecho e recebimentos | T17 | — | — |
| [T26](T26-inclusao-de-servico.md) | Inclusão de serviço durante o atendimento | T25, T18 | — | H01-Q1 (ramo) |
| [T27](T27-comissoes-e-extrato.md) | Comissões: lançamentos e extrato | T25, T06 | — | — |
| [T28](T28-correcoes-e-acoes-de-direito.md) | Correções de atendimento e ações sobre usos | T27, T15 | T29 | H01-Q5 (ramo) |
| [T29](T29-fechamento-e-repasses.md) | Fechamento mensal e repasses | T27 | — | H01-Q6 (ramo) |
| [T30](T30-central-e-push.md) | Central de notificações, pendências e Web Push | T03, T04, T05 | — | — |
| [T31](T31-mensagens-e-lembretes.md) | Mensagens ao cliente, lembretes e SAIR | T09, T17, T30 | — | — |
| [T32](T32-area-do-cliente.md) | Área do cliente: Início, Plano, Perfil, Reservas | T18, T20, T21, T23, T24, T31 | — | — |
| [T33](T33-crm-suporte-recuperacao.md) | CRM, suporte e recuperação assistida | T16, T25, T28 | — | H03 |
| [T34](T34-painel-financeiro-gestao.md) | Painel, financeiro e Gestão mobile | T22, T25, T29, T14 | — | — |
| [T35](T35-privacidade-e-exclusao.md) | Privacidade: exclusão diferida e anonimização | T23, T22, T15, T08 | — | H03 |
| [T36](T36-observabilidade-e-runbooks.md) | Observabilidade, métricas, incidentes e runbooks | T03 | T17, T20, T25 | — |
| [T37](T37-seguranca-e-permissoes.md) | Auditoria de segurança e permissões | T32, T33, T34, T35 | — | — |
| [T38](T38-staging-e-homologacao.md) | Staging e homologação das integrações | T12, T09, T10, T11, T04 | — | **H02** |
| [T39](T39-e2e-e-ensaio-de-recuperacao.md) | E2E completo e ensaio de recuperação | T38, T37, T36, T19, T26 | — | **H06** |
| [T40](T40-producao-e-go-live.md) | Produção e go-live controlado | T39 | — | **H03, H04, H05, H06** |

## Estados

| Estado | Significado |
|---|---|
| `todo` | Dependências de início não concluídas |
| `ready` | Pode ser delegada |
| `running` | Em execução por um subagente (registrar branch/worktree) |
| `review` | Entregue; orquestrador integrando e verificando |
| `done` | Integrada na `main`, verificada, critérios cumpridos |
| `blocked_human (Hxx)` | Parada num handoff; outra parte da task pode estar entregue (registrar qual) |
| `blocked_dependency (Tyy)` | Bloqueada por contrato ou falha de outra task |

## Regras para o subagente executor

1. Ler a task inteira, as seções do PRD citadas, os `README.md` dos módulos das dependências e o `AGENTS.md` da raiz (criado em T01).
2. Escrever **só** na área de escrita da task. Precisa mudar algo fora dela (contrato, outro módulo)? Parar e relatar ao orquestrador com a proposta; não editar.
3. Não inventar regra de negócio. Lacuna → registrar no relatório e marcar o ramo como `blocked_human (H01)`, entregando o resto.
4. Seguir o PRD §7 (arquitetura, contratos, defensivo) e §8 (testes). Comentários citam a decisão (`// D0058`).
5. Rodar `pnpm verify` antes de entregar. Entregar o relatório do PRD §11.5.
6. Em seção **🛑 Handoff humano**, parar exatamente onde indicado, usando a mensagem padrão de [handoffs/README.md](../handoffs/README.md). Nunca pedir ou registrar segredos.

## Modelo de task

```
# Txx — Título
| Campo | Valor |  (fase, iniciar após, concluir requer, gate, decisões, PRD, área de escrita, não tocar, paralelizável com)
## Objetivo
## Ler antes
## Escopo
## Fora do escopo
## Contratos (consome / publica)
## Regras e checklist defensivo
## Passos sugeridos
## Testes obrigatórios
## Critérios de aceite
## 🛑 Handoff humano (se houver)
## Entrega
```
