# T07 — Planos, versões, preços e teto (cadastro)

| Campo | Valor |
|---|---|
| Fase | 2 |
| Iniciar após | T06 |
| Concluir requer | T05 |
| Gate humano | — |
| Decisões | D0022, D0026, D0042 (estrutura de preço), D0060, D0061 (campo teto), D0062, D0075 |
| PRD | §3.3, RN06, RN09, §4.3 (P02, D06), §6.2 (planos) |
| Área de escrita | `src/modules/plans/**` (exceto `capacity/` de T20 e `price-adjustments/` de T24), rotas `src/routes/admin/planos/**` (cadastro e versões), `src/routes/(publico)/planos/**` |
| Não tocar | Assinaturas (T16), fluxo de reajuste e migração (T24) |
| Paralelizável com | T14, T38 |

## Objetivo

Planos como dados configuráveis e **versionados**: alterar serviços, dias, usos ou limites cria uma nova versão; preço tem vigência própria. Publicar a vitrine pública de planos e benefícios.

## Ler antes

PRD §3.3, RN06, RN09; D0022, D0062.

## Escopo

1. **Tabelas:** `planos` (nome, descrição, teto opcional, ativo, ordem), `plano_versoes` (plano, número, usos_por_ciclo, limite_reservas_simultaneas, janela_dias, vigente_desde, encerrada_em), `plano_versao_servicos` (serviços cobertos), `plano_versao_dias` (dias da semana permitidos), `plano_precos` (plano, valor_centavos, vigente_desde, origem `inicial`/`reajuste`).
2. **Regras de edição:** mudar serviços/dias/usos/limites/janela → nova versão para **novas contratações**; versão em uso por assinatura é imutável. Mudar preço não cria versão: é tratado por T24 (aqui só leitura do preço vigente e criação do preço inicial).
3. **Cobertura:** função pura `coverageOf(versao, servicoId, diaDaSemana)` → coberto ou não; usada por T13.
4. **Teto:** campo no plano (soma de todas as versões, usado por T20). Reduzir teto é permitido; a tela avisa quantas assinaturas ocupam vagas (consulta fornecida por T20 quando existir; até lá, 0).
5. **Seed de desenvolvimento** com os três planos aprovados (D0022) ligados a serviços fictícios "Corte", "Barba", "Corte + barba".
6. **Telas:** D06 (lista, criar plano, editar → prévia "isto cria a versão N; assinantes atuais continuam na versão M até aceitarem migração"); P02 público (por plano: cobertura, dias, usos por ciclo, reservas simultâneas, janela, regra de falta, regra de cancelamento tardio, preço, CTA "Assinar" → login).
7. Texto das regras gerado a partir dos dados (não texto livre) para nunca divergir da regra aplicada (pesquisa 21).

## Fora do escopo

Contratação, vagas (T20), reajuste e migração (T24), assinatura (T16).

## Contratos (publica)

`plans.getVersion`, `plans.currentVersion(planoId)`, `plans.currentPrice(planoId, instante)`, `coverageOf`, `plans.listPublic`, evento `PlanVersionCreated`.

## Regras e checklist defensivo

- `usos_por_ciclo ≥ 1`, `limite_reservas_simultaneas ≥ 1`, `janela_dias ≥ 1`, ao menos um serviço e um dia.
- Versão referenciada não pode ser editada nem apagada (constraint + teste).

## Testes obrigatórios

- Editar dias de um plano com assinante cria versão nova; assinante continua apontando a antiga.
- `coverageOf`: GOLD terça coberto; GOLD sexta não; BLACK barba não; PREMIUM corte+barba coberto.
- Vitrine pública mostra os números exatos da versão vigente.
- Autorização: só admin com auth recente edita.

## Critérios de aceite

Seed com os três planos aprovados visível em P02; D06 cria versões corretamente.

## Entrega

Relatório (PRD §11.5).
