# T36 — Observabilidade, métricas de produto, incidentes e runbooks

| Campo | Valor |
|---|---|
| Fase | 2 (início) → 9 (fechamento) |
| Iniciar após | T03 |
| Concluir requer | T17, T20, T25 (instrumentação presente nos fluxos principais) |
| Gate humano | — (destinatários de alertas em H05/H06) |
| Decisões | D0038 (outros indicadores depois do MVP), D0068, D0078 |
| PRD | §9 (inteiro), §7.8 (logs) |
| Área de escrita | `src/platform/observability/**`, `src/modules/metrics/**`, `src/routes/admin/suporte/incidentes/**`, `docs/operacao/runbooks/**`, `docs/operacao/triagem.md` |
| Não tocar | Telas de produto (instrumentação nos módulos é feita por cada task via `MetricsSink`) |
| Paralelizável com | quase todas |

## Objetivo

Saber o que está acontecendo sem expor dados pessoais: logs estruturados correlacionados, eventos de métricas de produto, alertas operacionais com dono e runbook, registro de incidentes e o processo de investigação, resposta e priorização do PRD §9.

## Ler antes

PRD §9; §7.8.

## Escopo

1. **Logs e correlação:** `correlationId` propagado da requisição para jobs, outbox, operações externas e entregas; níveis; redaction central; formato JSON no Railway.
2. **`MetricsSink`** real: `eventos_metricas` (nome, propriedades sem PII, instante, versão do app). Catálogo de eventos do PRD §9.5 com schema; teste que rejeita propriedades proibidas (telefone, nome, e-mail, token).
3. **Consultas internas** (não é o painel do MVP): conversão de agendamento por etapa, conflitos, ativação do clube, regularização, faltas, ocupação, latência de cancelamento, saúde de integrações — como consultas SQL versionadas em `src/modules/metrics/queries/` e uma página interna simples em D12 (admin).
4. **Alertas operacionais** (job a cada 5 min): fila de inbox atrasada, operações `incerta` antigas, cancelamentos sem confirmação > N horas, devoluções pendentes, WhatsApp desconectado (T09 `health`), falhas de push em massa, worker sem batimento, cobrança após pedido de cancelamento (P0). Cada alerta: severidade, dono (configurável), runbook, cria pendência do admin e incidente quando P0/P1.
5. **Incidentes:** `incidentes` (severidade P0–P3, título, início, impacto, estado, responsável, linha do tempo, causa, ações). Tela em D12.
6. **Runbooks** (`docs/operacao/runbooks/`): webhook atrasado/perdido; cobrança duplicada; cobrança após cancelamento; provedor fora do ar; WhatsApp banido/desconectado (D0031: parear novo número e trocar variáveis); OTP não chega; push não chega; restore (link para T39); exclusão travada; divergência de comissão. Cada um: sintomas, consultas, ação segura, comunicação ao cliente (modelo de resposta construtiva), quando escalar.
7. **Triagem** (`docs/operacao/triagem.md`): fluxo de investigação (§9.1), resposta (§9.2), priorização P0–P3 com apoio de IA (§9.4) — com as proibições (sem PII bruta em IA externa, sem ranking opaco de clientes, humano decide mudanças comerciais).

## Fora do escopo

Painel de negócio (T34); APM de terceiros (pode ser decidido depois; não incluir sem decisão).

## Contratos (publica)

`MetricsSink`, catálogo de eventos, `alerts.register`, `incidents.*`.

## Regras e checklist defensivo

- Nenhum dado pessoal em métricas e alertas.
- Alertas com deduplicação (não inundar).

## Testes obrigatórios

- Evento com propriedade proibida rejeitado.
- `correlationId` presente de ponta a ponta numa reserva (requisição → outbox → job de lembrete → entrega).
- Cada alerta dispara com fixture e fecha quando a condição some.

## Critérios de aceite

Runbooks escritos; alertas ativos em staging (T38/T39); consultas de métricas executáveis.

## Entrega

Relatório (PRD §11.5).
