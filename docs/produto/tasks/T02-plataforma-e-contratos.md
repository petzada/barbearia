# T02 — Plataforma núcleo e contratos compartilhados

| Campo | Valor |
|---|---|
| Fase | 0 |
| Iniciar após | T01 |
| Concluir requer | — |
| Gate humano | — |
| Decisões | D0012, D0015, D0019, D0071, D0080 |
| PRD | §6.1, §7.2, §7.3, §7.5, §7.8, §7.9 |
| Área de escrita | `src/contracts/**`, `src/platform/{db,context,authz,errors,money,time,ids,validation,audit,logging,idempotency}/**`, schema base |
| Não tocar | `src/modules/**` (ainda vazio), `src/routes/**` exceto um exemplo em `tests` |
| Paralelizável com | — (todas dependem dela) |

## Objetivo

Publicar os contratos e utilitários de plataforma que todos os módulos usam, para que as tasks seguintes rodem em paralelo sem reinventar contexto, erros, dinheiro, tempo, idempotência, autorização e auditoria.

## Ler antes

PRD §6.1, §7 inteiro, §8.2 (linha "Calendário").

## Escopo

1. **DB:** cliente Drizzle, helper de transação (`withTransaction(ctx, fn)`), convenção de schema por módulo (`modules/<m>/schema.ts` exportado em `src/platform/db/schema/index.ts`), tabela `barbearias` (id, slug, nome, fuso), seed que cria a barbearia do deploy a partir de `BARBEARIA_SLUG`.
2. **Contexto:** `RequestContext` (`barbeariaId` do deploy, `actorId`, `roles`, `sessionId`, `authTime`, `correlationId`, `clock`). O `barbeariaId` nunca vem do cliente.
3. **Construtores de server function:** `defineQuery` e `defineCommand` exigindo schema Zod, política de autorização (`public` só via allowlist em `src/platform/authz/public-allowlist.ts`), `requireRecentAuth` opcional; resolução de sessão por uma interface `SessionResolver` (T04 implementa; aqui, implementação de teste). Teste que varre `src/` e falha se houver `createServerFn` fora dos construtores.
4. **Autorização:** papéis `cliente`, `barbeiro`, `admin` combináveis; helpers `requireRole`, `requireOwnership(resourceOwnerId)`; erros `AUTH.REQUIRED`, `AUTH.FORBIDDEN`, `AUTH.RECENT_REQUIRED`.
5. **Erros e resultados:** `AppError` com `code` namespaced, mensagem segura, `fields`, `retryable`; `Result` (`ok`/`pending`/`error`); mapeamento para HTTP (401, 403, 409, 422, 429, 503). Formato para módulos declararem seus códigos em `errors.ts`.
6. **Idempotência:** tabela `chaves_idempotencia` e helper `withIdempotency(ctx, operation, key, payloadHash, fn)` (mesma chave + mesmo payload → mesmo resultado; payload diferente → `IDEMPOTENCY.KEY_REUSED`).
7. **Concorrência otimista:** helper para `expectedRevision` → `CONCURRENCY.REVISION_CONFLICT`.
8. **Dinheiro:** `Money` (centavos `bigint`/`number` seguro), `applyBasisPoints` (meio para cima), formatação BRL; proibição de float.
9. **Tempo:** `Clock` (real e controlável), `localDate`, `zonedInstant`, `addMonthsAnchored(date, n, anchorDay)` (D0080), `cycleRange(start, anchorDay)`; biblioteca de fuso escolhida e encapsulada.
10. **IDs:** UUID v7.
11. **Auditoria:** tabela `auditoria` e `AuditWriter` (ator, ação, recurso, antes/depois reduzidos, motivo, correlationId) usado dentro da transação.
12. **Logging:** logger estruturado com redaction (telefone mascarado; nunca OTP, token, cartão).
13. **Ports (só interfaces + fakes de teste):** `JobQueue`, `Outbox`, `PaymentProvider` (com `capabilities`), `NotificationProvider` (canais `otp`/`avisos`), `PushProvider`, `StorageProvider`, `MetricsSink`.
14. **Envelope de evento de domínio** e tipo base; cada módulo declara seus eventos.
15. **Validação de ambiente** no boot (schema Zod do `process.env`, falha clara se faltar variável).
16. `src/contracts/README.md` documentando tudo acima com exemplos.

## Fora do escopo

Implementação real de sessão (T04), outbox/jobs (T03), qualquer regra de negócio.

## Contratos (publica)

Tudo em `src/contracts` e `src/platform/*` listados acima. **T02 é a dona dos contratos**: mudanças futuras passam pelo orquestrador.

## Regras e checklist defensivo

- `barbearia_id` obrigatório em toda tabela de negócio (helper de coluna padrão).
- Nenhum `Date` cru no domínio: sempre via `Clock` e utilitários de tempo.
- Erros nunca expõem stack ou SQL ao cliente.

## Testes obrigatórios

- `addMonthsAnchored`: 31/01 → 28/02 (2027) → 31/03; 29/02/2028 → 29/03; âncora 30 em fevereiro bissexto e não bissexto; volta da âncora; fronteira `[início, fim)` no instante exato; conversão de fuso America/Sao_Paulo.
- `applyBasisPoints`: arredondamento meio para cima (ex.: 5000 bp de 1 centavo; 3333 bp de R$ 129,90).
- Idempotência: mesma chave/mesmo payload; mesma chave/payload diferente; concorrência de duas chamadas com a mesma chave.
- Construtores: server function sem política falha no teste de varredura; rota pública fora da allowlist falha.
- Auditoria grava na mesma transação (rollback não deixa auditoria).

## Critérios de aceite

- Contratos documentados; exemplos compilam; `pnpm verify` verde.
- Um exemplo end-to-end em teste: `defineCommand` com política, idempotência, auditoria e `Result`.

## Entrega

Relatório (PRD §11.5), destacando a API pública dos contratos.
