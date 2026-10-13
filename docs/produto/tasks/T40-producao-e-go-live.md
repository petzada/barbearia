# T40 — Produção e go-live controlado

| Campo | Valor |
|---|---|
| Fase | 11 |
| Iniciar após | T39 |
| Concluir requer | — |
| Gate humano | **H03, H04, H05, H06 parte 3** |
| Decisões | D0014, D0019, D0030, D0031, D0046, D0057, D0078 |
| PRD | §8.4, §10, H03–H06 |
| Área de escrita | `docs/operacao/go-live.md`, `config/barbearia-moura.yaml` (validação e importação; o conteúdo é do humano) |
| Não tocar | Código (correções voltam para as tasks donas) |
| Paralelizável com | — |

## Objetivo

Colocar a Barbearia do Moura em produção com contas definitivas, dados reais, backups, alertas e autorização humana explícita — e só então abrir o piloto.

## Ler antes

H03, H04, H05, H06; `docs/operacao/deploy.md`, `recuperacao.md`, runbooks.

## Passos (cada 🛑 é uma parada obrigatória)

1. **Checagem de pré-requisitos:** T39 `done`; H01 todas as perguntas respondidas e INT confirmadas (senão **🛑 PARAR** e pedir H01 pendente); nenhum P0/P1 aberto.
2. **🛑 H03:** textos legais aprovados e versionados, matriz de retenção, procedimento de recuperação aprovado. Sem isso, **PARAR**.
3. **🛑 H04:** `config/barbearia-moura.yaml` validado (`pnpm config:validate`) e prévia aprovada pelo dono da barbearia. Sem isso, **PARAR**.
4. **🛑 H05:** infraestrutura e contas de produção configuradas pelo humano (Railway prod com backups, domínio, R2, Mercado Pago do **dono da barbearia**, Woovi com subconta, WhatsMiau pareado, Google, VAPID, webhooks, destinatários de alertas). Confirmar **zero assinantes reais** na conta de teste (D0057). Sem isso, **PARAR**.
5. **Deploy de produção** pela promoção da versão aprovada em staging (D0078: teste → Moura); migrações; health verde; versão registrada.
6. **Carga de configuração:** `pnpm config:import config/barbearia-moura.yaml --env prod`; textos legais vigentes; flags `recuperacao_assistida_ativa` e `exclusao_real_ativa` ligadas conforme H03.
7. **Verificações de produção sem cliente:** webhooks recebendo evento de teste dos provedores; OTP real para um admin; push para a equipe; backup manual executado e listado; alertas chegando ao destinatário.
8. **🛑 H06 parte 3:** pedir autorização para a **transação real controlada** (assinatura de pessoa interna, cancelamento, devolução se aplicável). Executar só com autorização; registrar evidência; conferir conciliação.
9. **🛑 H06 parte 3 (continuação):** pedir autorização para abrir o piloto (data, divulgação, responsáveis por suporte). Só então declarar o lançamento.
10. **Pós-lançamento:** revisão diária na primeira semana (métricas de §9.5, incidentes, filas); revisão semanal depois.

## Critérios de aceite (MVP completo — PRD §8.4)

Todos os gates registrados; produção saudável; transação real conciliada; piloto autorizado. Se algo manual ficar pendente, `docs/operacao/go-live.md` lista exatamente o quê, quem, impacto e prazo — e o MVP **não** é declarado implantado enquanto houver item bloqueante.

## Entrega

Relatório (PRD §11.5) + `docs/operacao/go-live.md` com o registro de cada passo.
