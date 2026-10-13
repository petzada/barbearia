# T11 — Adapter Woovi (Pix Automático)

| Campo | Valor |
|---|---|
| Fase | 2 |
| Iniciar após | T03 |
| Concluir requer | — |
| Gate humano | — (sandbox real em T38/H02) |
| Decisões | D0004, D0008, D0018 (retentativas Pix), D0030 (conta do dono do produto + subconta), D0039, D0042, D0050, D0052, D0054, D0056 |
| PRD | RN05, RN08, RN09, §7.6; pesquisa [22 § Pix](../../pesquisas/22-mercado-pago-recorrente.md) |
| Área de escrita | `src/integrations/woovi/**`, rota `src/routes/api/webhooks/woovi/**` |
| Não tocar | Regras de assinatura (T16), telas (T20) |
| Paralelizável com | T09, T10, T12 |

## Objetivo

Implementar o `PaymentProvider` do Pix Automático na Woovi: criar a solicitação de recorrência (autorização no banco do cliente), acompanhar cobranças recorrentes, cancelar, devolver e traduzir webhooks para os mesmos eventos neutros do Mercado Pago.

## Ler antes

Documentação oficial da Woovi para Pix Automático (versão vigente — consultar antes de codificar e citar as URLs no README do adapter); pesquisa 22 (seção Pix, regras do Banco Central: autorização uma vez, tentativas no dia 18–21 h, até 3 datas em 7 dias se habilitado, valor fixo por autorização); D0030.

## Escopo

1. **Operações (via `runExternalOperation`):**
   - `createRecurring({ assinaturaId, valor, pagador, inicio, subconta })` → solicitação de recorrência + payload/QR/link de autorização; `correlationID`/referência = assinaturaId; buscar existente antes de criar.
   - `getRecurring`, `cancelRecurring` (autorização), `getCharge`, `refund` (devolução Pix com chave idempotente).
   - `createImmediateCharge(obrigacaoId, valor)` — **só será usado se H01-Q4 escolher a opção A/C**; implementar atrás de flag desligada.
   - `changeNextChargeDate` — capacidade `nao_verificado` até T38.
2. **Subconta:** recebimento direcionado à subconta da barbearia configurada (`WOOVI_SUBACCOUNT_ID`); nome do recebedor exposto para a tela de Pix (`receiverDisplayName`), conforme D0030.
3. **Webhook:** mecanismo de verificação documentado pela Woovi para a conta; inbox (T03); processamento consulta a API e emite os eventos neutros (`ProviderRecurringStatusChanged` — autorização concedida/recusada/cancelada pelo pagador —, `ProviderPaymentObserved`, `ProviderPaymentReversed`).
4. **Qualificação de IDs** por provedor, conta e ambiente.
5. **Capacidades declaradas** iguais às do T10, mais: retentativas após vencimento habilitáveis, cancelamento pelo pagador notificado.
6. **Fake conforme** + fixtures + suíte de contrato compartilhada com T10.

## Fora do escopo

Estado local da assinatura (T16); telas (T20); troca de recorrência coordenada (T24 usa estas operações).

## Contratos (publica)

`PaymentProvider` (Pix), eventos neutros, `receiverDisplayName`, `capabilities`, fake.

## Regras e checklist defensivo

- Autorização concedida **não** é pagamento; só cobrança liquidada e consultada vira `ProviderPaymentObserved(aprovado)`.
- Valor da cobrança diferente do autorizado → `divergente`.
- Cancelamento pelo pagador no banco → evento de recorrência cancelada (T23 reflete).
- Segredos só em variáveis; nada de chave em log.

## Testes obrigatórios

- Webhook: verificação válida/inválida; duplicado; fora de ordem.
- Autorização sem cobrança não vira pagamento.
- Cobrança recusada no dia e aprovada na retentativa → um pagamento aprovado com instante da liquidação.
- Refund idempotente.
- Fake e real (fixtures) na mesma suíte de T10.

## Critérios de aceite

Adapter e fake publicados; README com URLs da documentação consultada e capacidades `nao_verificado`.

## Entrega

Relatório (PRD §11.5) listando o que T38 precisa provar.
