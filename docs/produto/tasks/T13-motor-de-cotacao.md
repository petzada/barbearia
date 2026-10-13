# T13 — Motor de cotação e cobertura

| Campo | Valor |
|---|---|
| Fase | 3 |
| Iniciar após | T07 |
| Concluir requer | — |
| Gate humano | — |
| Decisões | D0025, D0027, D0033, D0035, D0049, D0058, D0059, D0063, D0065, D0066 |
| PRD | RN02, RN03 (duração), RN04 (prazo), RN14, §5.15 (INT-02, INT-03, INT-05, INT-13) |
| Área de escrita | `src/modules/pricing/**` |
| Não tocar | Agenda (T14), direitos (T15), reservas (T17) |
| Paralelizável com | T15 |

## Objetivo

Uma função de domínio pura, mais um serviço de aplicação fino, que transforma "cliente + serviços + horário + barbeiro" em uma **cotação** completa e assinada por hash: itens normalizados, cobertura por item, uso consumido, preços e referências a preservar, duração, prazo sem perda e avisos. É a única fonte de preço e cobertura do sistema.

## Ler antes

PRD RN02, RN04, RN14, §5.15; D0027, D0049, D0065, D0066.

## Escopo

1. **Entrada:** `{ servicos[], inicio, barbeiroId, origem: 'cliente'|'equipe', agora, parametros (grade, antecedência, prazo), catalogoSnapshot (preços, durações, combos, revisão), coverageContext }`. O `coverageContext` vem de T15 (`entitlements.coverageContext`) e contém: versão de plano aplicável à data (ou nenhuma), fonte de uso disponível (ciclo pago, ciclo projetado, crédito válido com condições) ou motivo de indisponibilidade (`sem_assinatura`, `suspensa`, `sem_saldo`, `limite_reservas_plano`, `fora_da_janela`, `apos_fim_do_ciclo`).
2. **Normalização:** remover duplicatas; aplicar combo equivalente (`findEquivalentCombo`, T06) e registrar o ajuste para exibição.
3. **Cobertura (D0027, D0049):** para cada serviço (ou componente), `coverageOf(versao, servico, diaDaSemana)` (T07).
   - Nenhum item coberto, ou fonte de uso indisponível → visita **avulsa**, sem uso, com o motivo explícito.
   - Todos cobertos → visita coberta, **1 uso**, combo com referência própria.
   - Parcial → combo dividido em componentes; coberto com referência do componente; avulso com preço do componente; duração do combo.
   - Crédito de reposição só cobre o que as condições do crédito cobrem.
   - INT-13: sem saldo ou com limite de reservas de plano atingido, a cotação oferece a visita como avulsa, com motivo; o cliente decide.
4. **Valores preservados:** cada item traz `precoAvulsoCentavos` (se avulso) e `referenciaCentavos` (se coberto), `versaoPlanoId`, `servicoId`, `comboPaiId`.
5. **Duração:** soma das durações (combo usa a própria), arredondada para cima ao múltiplo da grade; `fim = inicio + duração`.
6. **Prazo:** `cancelDeadline = inicio − prazo` (congelado); `nasceComprometida = agora ≥ cancelDeadline`; para `origem = cliente`, validar `inicio − agora ≥ antecedência` (senão erro `PRICING.MIN_ADVANCE`).
7. **Avisos** (lista tipada para a UI): combo aplicado; parte avulsa paga na barbearia com valor; uso será consumido; nasce comprometida; previsão condicionada à renovação (INT-02); dia fora do plano; fonte usada (ciclo ou crédito e validade).
8. **Proposta e hash:** `hash` = SHA-256 do conteúdo canônico (itens, valores, cobertura, duração, deadline, barbeiro, início); `expiraEm` curto (ex.: 10 min, técnico); `revisaoCatalogo`. Persistir em `cotacoes` para auditoria e aceite (RN14).
9. **Serviço de aplicação** `pricing.quote(ctx, input)` que monta o snapshot do catálogo e chama o domínio; e `pricing.verify(ctx, cotacaoId, hash)` que recalcula e devolve `ok` ou `PRICING.QUOTE_STALE` com a nova cotação.

## Fora do escopo

Disponibilidade de agenda (T14), saldo e limites (T15 fornece no contexto), persistência de reservas (T17).

## Contratos (publica)

`quote` (domínio puro), `pricing.quote`, `pricing.verify`, tipo `Cotacao`, catálogo de avisos, erros `PRICING.*`.

## Regras e checklist defensivo

- Nenhum float; centavos e minutos inteiros.
- Seleção vazia, serviço inativo, barbeiro não habilitado para todos os itens → erro tipado.
- A cotação nunca confia em valores vindos do cliente: só ids e instante.

## Testes obrigatórios (tabela de casos)

| Caso | Esperado |
|---|---|
| BLACK, corte, sábado | coberto, 1 uso |
| BLACK, corte + barba (combo existe) | combo dividido: corte coberto (referência do corte), barba avulsa (preço da barba); duração do combo |
| BLACK, corte e barba selecionados separadamente | igual ao anterior (combo equivalente aplicado e informado) |
| GOLD, corte + barba, terça | combo inteiro coberto, 1 uso, referência do combo |
| GOLD, corte + barba, sexta | combo inteiro avulso, sem uso |
| PREMIUM, só corte | coberto, 1 uso |
| Suspensa, qualquer data | avulso, motivo `suspensa` (INT-05) |
| Crédito válido BLACK, assinatura cancelada | corte coberto pelo crédito |
| Data em ciclo projetado | coberto como previsão (INT-02) |
| Sem saldo no ciclo da data | avulso com motivo `sem_saldo` (INT-13) |
| Cliente marcando 1h59 antes com antecedência 2h | `PRICING.MIN_ADVANCE` |
| Equipe marcando 30 min antes, prazo 2h | `nasceComprometida = true` com aviso |
| Duração 45 min → ocupa 60 min | arredondamento da grade |
| Preço alterado entre cotar e confirmar | `verify` → `QUOTE_STALE` com nova cotação |

Propriedade: soma dos itens avulsos = total avulso; nenhuma visita coberta consome mais de 1 uso.

## Critérios de aceite

Todos os casos acima e os de borda verdes; README do módulo com exemplos de entrada e saída.

## Entrega

Relatório (PRD §11.5).
