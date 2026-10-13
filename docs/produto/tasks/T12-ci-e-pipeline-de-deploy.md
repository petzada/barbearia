# T12 — CI, build, deploy no Railway, health e versão instalada

| Campo | Valor |
|---|---|
| Fase | 2 |
| Iniciar após | T03 |
| Concluir requer | — |
| Gate humano | — (contas Railway são H02/H05; aqui tudo é do lado do repositório) |
| Decisões | D0006, D0014, D0016, D0019, D0078 |
| PRD | §7.1, §7.7, §8.3 |
| Área de escrita | `.github/workflows/**` (ou equivalente), `railway.json`/`railway.toml` ou `Dockerfile`, `src/routes/api/health/**`, `src/platform/release/**`, `scripts/deploy-*.ts`, `docs/operacao/deploy.md` |
| Não tocar | Código de módulos |
| Paralelizável com | T06–T11 |

## Objetivo

Deixar o repositório pronto para rodar em qualquer ambiente Railway (staging, produção por barbearia) com um comando, com CI que roda `verify`, migrações seguras no deploy, health checks para web e worker e registro da versão instalada.

## Ler antes

PRD §7.1, §7.7; D0014, D0078.

## Escopo

1. **CI:** pipeline que roda em PR e na `main`: install com lockfile, `lint`, `typecheck`, `test:unit`, `test:integration` (Postgres de serviço), `build`, `test:e2e` (em PR pode ser subset; na `main`, completo). Cache de dependências. Se não houver remoto ainda, o script `pnpm ci:local` reproduz o mesmo pipeline.
2. **Build e start:** comandos para `web` e `worker` no mesmo artefato; variável `PROCESS_ROLE`.
3. **Migrações no deploy:** passo `pnpm db:migrate` antes de subir o novo web (pre-deploy), com lock para não rodar duas vezes; migrações devem ser compatíveis com a versão anterior em execução (expand/contract documentado no `AGENTS.md`).
4. **Health:** `/api/health/live` (processo vivo) e `/api/health/ready` (banco, migrações aplicadas, modo recuperação, worker com batimento recente). Worker grava batimento.
5. **Versão instalada:** tabela `instalacao` (versão semver + commit, aplicada_em, ambiente); gravada no boot; exibida em D11 (T08) e no health.
6. **Liberação por etapas:** `docs/operacao/deploy.md` descrevendo o fluxo teste → Moura → demais (D0078), com tags de versão e promoção manual.
7. **Validação de ambiente** no boot (usa o schema de T02) e falha clara.
8. **Backups:** documentar onde configurar no Railway e como disparar backup manual (a execução real é H05/T39).

## Fora do escopo

Criar projetos Railway (H02/H05); homologar provedores (T38).

## Contratos (publica)

Health endpoints, tabela `instalacao`, comandos de deploy, `docs/operacao/deploy.md`.

## Regras e checklist defensivo

- Nenhum segredo no repositório nem nos logs do CI.
- Migração destrutiva exige passo manual explícito documentado.
- Teste de build que procura padrões de segredo no bundle do cliente (ex.: nomes de variáveis privadas) e falha.

## Testes obrigatórios

- Health `ready` falha com banco indisponível e com modo recuperação ativo (mostra estado).
- Boot falha com variável obrigatória ausente.
- Bundle do cliente não contém variáveis privadas.

## Critérios de aceite

`pnpm ci:local` verde; documento de deploy pronto para T38 seguir; health e versão funcionando localmente.

## Entrega

Relatório (PRD §11.5) com a lista de variáveis por ambiente.
