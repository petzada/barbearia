# Catálogo (T06)

Serviços e combos canônicos, perfis públicos de barbeiros, habilitações e percentuais de comissão por vigência.

## Contratos publicados

- `getService(servicos, id)` / `getServices(servicos)` — leitura pura de serviços carregados.
- `findEquivalentCombo(selecaoDeServicos, combos)` — encontra somente um combo ativo com conjunto exatamente igual.
- `expandCombo(selecaoDeServicos, combos)` — mantém o combo e inclui seus componentes para as validações da visita.
- `isEnabledForAll(habilitacoes, barbeiroId, servicosExpandidos)` — exige habilitação do combo e de cada componente.
- `percentAt(vigencias, barbeiroId, servicoId, tipo, dataLocal)` — percentual vigente na data local ou `null` quando não há cadastro.
- `catalog.listPublicCatalog` e `catalog.listPublicBarbers` — DTOs públicos; excluem contatos, identificadores de usuário e comissões.
- Eventos: `ServicePriceChanged`, `ServiceDurationChanged`, `EnablementChanged` e `CommissionRateScheduled`.

Consumidores: T13 usa preço, duração, combos e `findEquivalentCombo`; T14 usa habilitações; T27 usa preço preservado e vigências de comissão.

## Persistência e integrações

As tabelas Drizzle ficam neste módulo. A migração `t06_catalogo_servicos_equipe` cria o schema e o índice parcial que impede combos ativos equivalentes. `barbeiros.usuario_id` fica sem FK até T04 criar o agregado de identidade. Os ports de eventos e StorageProvider usam fakes em `deps.ts` até T03 e T08 fornecerem adaptadores reais.

## Rotas

- `/servicos` e `/barbeiros`: consulta pública sem agenda, dados de contato ou percentuais.
- `/admin/servicos`: cadastro, alteração de preço/duração e desativação com autenticação recente.
- `/admin/equipe/matriz`: habilitações e vigências de comissão com autenticação recente.
