# T08 — Configuração da barbearia, marca, parâmetros e arquivos (R2)

| Campo | Valor |
|---|---|
| Fase | 2 |
| Iniciar após | T03 |
| Concluir requer | T04, T05 |
| Gate humano | — (formulário de H04 é produzido aqui; a carga real é T40) |
| Decisões | D0007, D0012, D0019, D0031 (config otp/avisos), D0046 (textos por barbearia), D0058 (prazos), D0081 |
| PRD | §3.3, §7.8, §4.3 (D11), [H04](../handoffs/H04-dados-reais-e-marca.md) |
| Área de escrita | `src/modules/settings/**`, `src/integrations/r2/**`, rotas `src/routes/admin/configuracoes/**`, `config/templates/**`, `config/textos/` (rascunhos vazios), `scripts/config-*.ts` |
| Não tocar | Catálogo e planos (usa as APIs deles na importação) |
| Paralelizável com | T06, T09–T12 |

## Objetivo

Toda diferença entre barbearias vem de configuração: marca, textos, parâmetros de agenda e assinatura, fuso. Arquivos ficam no R2 com upload seguro. Entregar o formulário/validador que o humano usa no H04.

## Ler antes

PRD §3.3, §7.8; D0012, D0019; H04.

## Escopo

1. **Configuração versionada:** `configuracoes` (versão, vigente, payload validado por schema Zod, alterado_por, motivo). Parâmetros do PRD §3.3 com padrões; `BrandConfig` (nome, cores, logo, textos das boas-vindas, versão das boas-vindas). API `settings.get(ctx)` com cache por requisição.
2. **Mudança de parâmetro** não afeta reservas já confirmadas (prazo congelado é responsabilidade de T17; aqui, aviso na tela).
3. **Aviso de configuração arriscada:** se antecedência mínima < prazo de cancelamento, a tela avisa que reservas nascerão comprometidas (D0058).
4. **StorageProvider R2:** URL pré-assinada de upload (PUT) com tipo/tamanho permitidos, chave gerada pelo servidor (`<barbearia>/<propósito>/<dono>/<uuid>`), confirmação de upload (HEAD) antes de marcar o arquivo `ativo`; URL pré-assinada de leitura curta para arquivos privados; arquivos públicos de marca/barbeiros servidos por rota própria com cache. Tabela `arquivos` (dono, propósito, chave, mime, tamanho, estado, removido_em). Job de limpeza de órfãos (uploads não confirmados em 24 h).
5. **Importador de configuração (H04):**
   - `config/templates/barbearia.example.yaml` comentado (marca, serviços, combos, barbeiros, matriz, jornadas, planos, teto, parâmetros), com valores **fictícios marcados como exemplo**;
   - `pnpm config:validate <arquivo>` (erros com caminho do campo);
   - `pnpm config:preview <arquivo>` (resumo legível);
   - `pnpm config:import <arquivo> --env <ambiente>` idempotente, usando as APIs de T06, T07 e T14 (quando existirem; o import de jornadas pode ser ativado depois de T14).
6. **Tela D11:** marca e parâmetros (admin, auth recente), textos legais (lista de versões; publicação de nova versão exige confirmação), saúde das integrações (configurada/não configurada/última falha — nunca o valor do segredo), versão instalada (de T12).
7. **Variáveis de ambiente** novas no `.env.example` com descrição: `R2_*`, `WHATSAPP_OTP_INSTANCE`, `WHATSAPP_AVISOS_INSTANCE` (podem ser iguais no piloto).

## Fora do escopo

Conteúdo jurídico dos textos (H03/T35); dados reais (H04/T40).

## Contratos (publica)

`settings.get`, `BrandConfig` real para T05, `StorageProvider` (R2) e fake, `files.requestUpload`, `files.confirmUpload`, `files.signedRead`, `files.removeByOwner` (usado por T35).

## Regras e checklist defensivo

- Validar MIME pelo conteúdo confirmado (HEAD/ContentType) e tamanho máximo.
- Nunca aceitar URL externa como arquivo.
- Configuração inválida não entra em vigor (validação antes de gravar).

## Testes obrigatórios

- Schema de configuração: valores padrão, valores inválidos rejeitados, versão nova preserva histórico.
- Upload: tipo proibido rejeitado; upload não confirmado não aparece; órfão limpo pelo job (relógio controlado).
- Importador: arquivo de exemplo valida; rodar duas vezes não duplica.
- Autorização: só admin com auth recente altera configuração.

## Critérios de aceite

`pnpm config:validate config/templates/barbearia.example.yaml` passa; D11 funcional; R2 provado com fake e, quando H02 existir, em T38.

## Entrega

Relatório (PRD §11.5) com o caminho do template a ser enviado ao humano no H04.
