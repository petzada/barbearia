# T06 — Catálogo: serviços, combos, barbeiros e matriz barbeiro × serviço

| Campo | Valor |
|---|---|
| Fase | 2 |
| Iniciar após | T02 |
| Concluir requer | T04 (papéis), T05 (telas) |
| Gate humano | — (dados reais em H04/T40) |
| Decisões | D0023, D0033, D0037, D0049, D0065, D0075 |
| PRD | RN02, §4.3 (P03, P04, D04-matriz, D05), §6.2 (catálogo) |
| Área de escrita | `src/modules/catalog/**`, rotas `src/routes/admin/servicos/**`, `src/routes/admin/equipe/matriz/**`, `src/routes/(publico)/servicos/**`, `src/routes/(publico)/barbeiros/**` |
| Não tocar | Papéis (T04), planos (T07) |
| Paralelizável com | T03, T08, T09, T10, T11 |

## Objetivo

Cadastro de serviços e combos canônicos, perfil público dos barbeiros e a matriz barbeiro × serviço (habilitação, % avulso, % assinante, com vigência), mais as telas públicas de serviços e barbeiros.

## Ler antes

PRD RN02; D0023, D0037, D0049, D0065.

## Escopo

1. **Serviços:** `servicos` (nome, descrição, preço em centavos, duração em minutos > 0, tipo `simples`/`combo`, ativo, foto opcional via StorageProvider). Desativar preserva histórico; nada é apagado se referenciado.
2. **Combos:** `combo_componentes` (combo, componente). Validações: ≥ 2 componentes, todos simples e ativos, sem autorreferência, **sem outro combo ativo com o mesmo conjunto** (assinatura canônica = ids ordenados; índice único parcial por barbearia onde ativo).
3. **Função pura `findEquivalentCombo(selecaoDeServicos)`** exportada para T13: retorna o combo cujo conjunto de componentes é exatamente a seleção.
4. **Barbeiros:** `barbeiros` (usuário, nome de exibição, foto, bio, ativo, ordem). Um barbeiro é um usuário com papel `barbeiro` (T04).
5. **Habilitação:** `habilitacoes` (barbeiro, serviço, habilitado). Barbeiro novo sem habilitações. Função `isEnabledForAll(barbeiroId, servicosExpandidos)` considerando combo **e** componentes.
6. **Comissões vigentes:** `comissao_vigencias` (barbeiro, serviço, pct_avulso_bp, pct_assinante_bp, inicio, fim). Nova vigência fecha a anterior; sem sobreposição; % assinante padrão = % avulso no formulário. Função `percentAt(barbeiroId, servicoId, tipo, dataLocal)`.
7. **Telas admin desktop (auth recente nas mutações):** D05 serviços/combos (lista, criar, editar preço/duração com aviso "vale só para novas reservas", desativar); D04-matriz (grade barbeiro × serviço com habilitado e percentuais, edição com data de início da vigência).
8. **Telas públicas:** P03 serviços (preço, duração, componentes do combo); P04 barbeiros (foto, nome, serviços que faz). Sem horários, sem telefone, sem percentuais.
9. Eventos: `ServicePriceChanged`, `ServiceDurationChanged`, `EnablementChanged`, `CommissionRateScheduled`.

## Fora do escopo

Cotação (T13), agenda (T14), planos (T07), lançamentos de comissão (T27).

## Contratos (publica)

`catalog.getService(s)`, `findEquivalentCombo`, `expandCombo`, `isEnabledForAll`, `percentAt`, `listPublicCatalog`, eventos acima.

## Regras e checklist defensivo

- Preço e duração validados (inteiros positivos; duração múltipla de 5 min sugerida, não obrigatória).
- Alterar preço/duração **não** altera reservas (D0066, D0069) — só registra evento.
- DTO público não carrega dados de comissão nem de contato.

## Testes obrigatórios

- Combo duplicado (mesmo conjunto em outra ordem) rejeitado; combo com combo rejeitado; componente inativo rejeitado.
- `findEquivalentCombo`: exato encontra; subconjunto ou superconjunto não.
- Habilitação: barbeiro habilitado no combo mas não num componente → não habilitado para a visita.
- Vigências: troca de percentual em 15/10 → atendimento de 14/10 usa o antigo, de 15/10 o novo; sem sobreposição.
- Autorização: barbeiro não edita catálogo; visitante vê só DTO público.

## Critérios de aceite

Cadastros e telas funcionando com seed fictício; funções exportadas documentadas no `README.md` do módulo.

## Entrega

Relatório (PRD §11.5).
