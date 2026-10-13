# T03 — Durabilidade: jobs, outbox, inbox, operações externas e modo recuperação

| Campo | Valor |
|---|---|
| Fase | 1 |
| Iniciar após | T02 |
| Concluir requer | — |
| Gate humano | — |
| Decisões | D0016, D0055, D0078, D0015 (webhooks) |
| PRD | §7.5, §7.6, §7.7 |
| Área de escrita | `src/platform/{jobs,outbox,inbox,external-ops,recovery}/**`, `src/worker.ts` |
| Não tocar | `src/contracts` (propor mudança ao orquestrador) |
| Paralelizável com | T04, T05 |

## Objetivo

Garantir que nenhum efeito se perca ou se duplique: eventos e jobs nascem na mesma transação do dado; webhooks são persistidos antes do ACK; chamadas a provedores são intenções persistidas com estado; e o sistema sabe entrar em modo recuperação.

## Ler antes

PRD §7.5–§7.7; D0016, D0078; documentação do pg-boss da versão fixada.

## Escopo

1. **JobQueue (pg-boss):** implementação do port; filas nomeadas; agendamento por instante (`startAfter`); `singletonKey` para dedupe; cancelamento por chave; política de retentativa padrão (imediato, 1, 5, 15, 60 min com jitter) e configurável por fila; dead letter → cria pendência via hook (interface; T30 implementa a pendência real).
2. **Transação:** verificar se o pg-boss da versão fixada consegue enfileirar usando a conexão/transação do Drizzle. Se sim, `enqueueInTx`. Se não, usar **outbox**: tabela `outbox` gravada na transação + dispatcher no worker que publica no pg-boss de forma idempotente (por id do evento). Documentar a escolha.
3. **Outbox de eventos de domínio:** `publishInTx(ctx, event)`; dispatcher entrega a handlers registrados por tipo, com idempotência por `(handler, eventId)`.
4. **Inbox de provedores:** tabela `inbox_provedor` (provedor, conta, ambiente, id do evento, hash, cabeçalhos relevantes, corpo limitado, recebido_em, estado, tentativas); `receiveWebhook(provider, verifyFn, parseFn)` para rotas: verifica, persiste e responde; processamento assíncrono por job com handler registrado pelo adapter.
5. **Operações externas:** tabela `operacoes_externas` (tipo, chave idempotente, alvo, estado `pendente/em_andamento/confirmada/incerta/falhou`, tentativas, último erro, resultado). Helper `runExternalOperation` = persistir intenção → commit → chamar → registrar; timeout após possível sucesso → `incerta` → job de reconciliação chama `reconcileFn` antes de repetir.
6. **Worker:** `src/worker.ts` inicia pg-boss, registra handlers dos módulos (registro por import de `modules/*/jobs.ts`), encerra graciosamente.
7. **Modo recuperação:** tabela `estado_recuperacao` (ativo, ponto restaurado, ativado_por, motivo); quando ativo, `runExternalOperation` e envios recusam com `SYSTEM.RECOVERY_MODE`, jobs de efeito externo ficam pausados; só operador (CLI `pnpm ops:recovery on|off --reason`) altera; nunca por rota de usuário.
8. `README.md` do módulo com exemplos para as tasks consumidoras.

## Fora do escopo

Handlers de negócio; adapters de provedores (T09–T11); pendências reais (T30).

## Contratos (publica)

`enqueueInTx`/`publishInTx`, registro de handlers, `receiveWebhook`, `runExternalOperation`, `isRecoveryMode`, CLI de recuperação.

## Regras e checklist defensivo

- ACK do webhook só depois de persistir; falha de persistência → 5xx.
- Corpo de webhook limitado (ex.: 256 KB) e sem dados de cartão.
- Reprocessar exige motivo e preserva o registro original (nunca apagar inbox).
- Erro permanente (4xx de configuração) não entra em loop: vai direto para falhou + pendência.

## Testes obrigatórios (Postgres real)

- Rollback da transação não publica evento nem job.
- Dispatcher entregando duas vezes o mesmo evento não executa o handler duas vezes.
- Mesmo webhook recebido duas vezes → um registro processado.
- Timeout depois de sucesso simulado → `incerta` → reconciliação encontra sucesso → `confirmada` sem segunda chamada.
- Modo recuperação bloqueia operação externa e job de efeito.
- Worker reinicia sem perder jobs agendados.

## Critérios de aceite

Mecanismos documentados e provados com testes de integração; `pnpm dev:worker` processa um job de exemplo.

## Entrega

Relatório (PRD §11.5) com a decisão "pg-boss na transação × outbox" e sua evidência.
