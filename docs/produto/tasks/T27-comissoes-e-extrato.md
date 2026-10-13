# T27 — Comissões: lançamentos imutáveis, períodos e extrato do barbeiro

| Campo | Valor |
|---|---|
| Fase | 6 |
| Iniciar após | T25, T06 |
| Concluir requer | — |
| Gate humano | — |
| Decisões | D0009, D0023, D0027, D0049, D0059 (crédito = % assinante), D0064, D0066, D0067 |
| PRD | RN11, §5.15 (INT-11), §4.3 (B04) |
| Área de escrita | `src/modules/commissions/{posting,periods,statement}/**`, rotas `src/routes/equipe/ganhos/**` |
| Não tocar | Fechamento e repasses (T29), correções (T28) |
| Paralelizável com | T21, T26 |

## Objetivo

Cada atendimento realizado vira lançamentos de comissão imutáveis e explicáveis (base, percentual, valor, origem), no período certo. O barbeiro vê exatamente o que vai receber.

## Ler antes

PRD RN11, INT-11; D0023, D0066, D0067.

## Escopo

1. **Tabelas:** `periodos_comissao` (mês civil local, estado `aberto`/`fechado`/`parcialmente_pago`/`quitado`, criados sob demanda), `lancamentos_comissao` (barbeiro, atendimento, item, serviço, tipo `assinante`/`avulso`, base_centavos, pct_bp, valor_centavos, data do atendimento, período de lançamento, período de origem, `ajuste_de`, motivo).
2. **Handler `AttendanceFinalized(realizado)`** (idempotente por atendimento+item):
   - para cada item (combo inteiro → uma linha; combo dividido → uma por componente; inclusões de T26 → uma por item incluído);
   - base = referência preservada (coberto/crédito) ou preço avulso preservado;
   - pct = `percentAt(barbeiro, serviço, tipo, dataDoAtendimento)` (T06) — **data do atendimento**, não do registro;
   - valor = `applyBasisPoints(base, pct)` (meio para cima, uma vez por linha);
   - período = mês do atendimento se aberto; senão **primeiro período aberto** (ordem cronológica), com período de origem registrado.
   - falta → nenhum lançamento.
3. **API para ajustes** (usada por T28): `postAdjustment(origem, valor, motivo)` com as mesmas regras de período.
4. **Extrato (B04):** por mês, lista de lançamentos (data, cliente primeiro nome, serviço, plano/avulso, base, %, valor), ajustes com origem ("ajuste do atendimento de 28/09"), total, status do período e repasses (quando T29 existir).
5. **Leituras** para T29 (devido por barbeiro e período) e T34.

## Fora do escopo

Fechar período e registrar repasses (T29), correções (T28).

## Contratos (publica)

`commissions.postFromAttendance`, `commissions.postAdjustment`, `commissions.periodFor(data)`, `commissions.statement(barbeiro, mês)`, `commissions.dueByPeriod`, evento `CommissionPosted`.

## Regras e checklist defensivo

- Lançamento nunca é atualizado nem apagado (constraint/trigger que impede UPDATE/DELETE).
- Período fechado não recebe lançamento (verificação com lock do período).
- Barbeiro só vê o próprio extrato.

## Testes obrigatórios

- % mudou entre o atendimento e o registro tardio → usa o % da data do atendimento.
- Preço mudou depois da reserva → base preservada.
- BLACK corte+barba → duas linhas (corte assinante, barba avulso).
- GOLD combo coberto → uma linha do combo com % assinante.
- Crédito de reposição → % assinante (INT-11).
- Registro tardio com setembro e outubro fechados → entra em novembro (primeiro aberto) com origem setembro.
- Arredondamento: 33,33% de R$ 129,90; soma do extrato = soma das linhas.
- Evento duplicado → sem lançamento duplicado.

## Critérios de aceite

Extrato B04 funcional; lançamentos provadamente imutáveis.

## Entrega

Relatório (PRD §11.5).
