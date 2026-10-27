# Adapter Woovi — Pix Automático

O adapter implementa `PaymentProvider`, verifica webhooks com RSA SHA-256 (`x-webhook-signature`) e consulta a API antes de produzir eventos neutros. HMAC via `x-openpix-signature` permanece como alternativa quando `WOOVI_WEBHOOK_SECRET` estiver configurado. Não registre credenciais nem o corpo bruto em logs.

## Endpoints e comportamento

- Criar/consultar autorização: `POST` e `GET /api/v1/subscriptions`; usa `correlationID = assinaturaId`, valor em centavos, `type: PIX_RECURRING`, jornada `ONLY_RECURRENCY` e frequência mensal. A busca por `correlationID` acontece antes da criação.
- Cancelar autorização: `PUT /api/v1/subscriptions/{id}/cancel`.
- Consultar parcelas: `GET /api/v1/installments/{id}`. Apenas uma cobrança consultada como liquidada produz `ProviderPaymentObserved`; autorização sozinha nunca representa pagamento. O instante de liquidação vem da resposta da cobrança.
- Devolver Pix: `POST /api/v1/refund`, com `correlationID` como chave de idempotência.
- Cobrança Pix imediata: `POST /api/v1/charge`; desligada por padrão via `WOOVI_IMMEDIATE_CHARGE_ENABLED=false`. Quando ligada, envia `correlationID = obrigacaoId` e `subaccount = WOOVI_SUBACCOUNT_ID`, vinculando a regularização à mesma obrigação.
- Worker: `jobs.ts` registra o inbox handler Woovi e as definições de external operation. O worker carrega `src/integrations/*/jobs.ts` pelo mesmo scanner usado por módulos. A integração usa `inbox.process` e `external-ops.advance` do T03.

`RecurringPayer.address` é opcional para os consumidores do contrato compartilhado. Como a criação Pix Automático documenta endereço obrigatório, a ausência gera `WOOVI.PAYER_ADDRESS_REQUIRED` antes de qualquer chamada. A coleta no checkout é decisão de produto (H01), fora deste adapter.

## Capacidades

Todas permanecem `nao_verificado` até teste em T38: mudança de próxima cobrança, instante de aprovação, estorno duplicado, eventos de reversão, alteração de cobrança agendada, datas âncora 29–31, retentativa após vencimento e aviso de cancelamento feito pelo pagador. A política enviada na assinatura usa `NON_PERMITED` por padrão; `THREE_RETRIES_7_DAYS` só deve ser habilitada depois da prova e confirmação de produto.

## Perguntas para H01/T38

- H01 deve decidir se e quando o checkout coleta o endereço completo obrigatório do pagador.
- T38 deve confirmar RSA, formato do header, endpoint e rotação das chaves públicas em sandbox. A verificação aceita qualquer chave retornada pelo endpoint oficial e mantém cache por até uma hora.
- T38 deve confirmar se as assinaturas Pix Automático da conta principal podem direcionar recebimentos à subconta. A documentação pública de criação de assinatura não lista `subaccount`; o adapter não envia campo não documentado nessa chamada. O campo `subaccount` está implementado apenas no endpoint documentado de cobrança Pix imediata.
- T38 deve verificar qual nome aparece para o pagador, se a subconta configurada está correta, se a cobrança imediata chega à subconta e se a correlação pela obrigação é reconhecida nos webhooks.
- T38 deve provar os estados de autorização/cancelamento pelo pagador, o instante de liquidação, o relacionamento entre parcelas e assinatura, a idempotência de devolução e a política de retentativa após vencimento.

## Documentação oficial consultada

- [Criar Pix Automático](https://developers.woovi.com/docs/pix-automatic/pix-automatic-how-to-create)
- [Rotas Pix Automático](https://developers.woovi.com/docs/pix-automatic/pix-api-routes)
- [Webhooks Pix Automático](https://developers.woovi.com/docs/pix-automatic/webhooks/pix-automatic-webhooks)
- [Chaves públicas de webhooks](https://developers.woovi.com/docs/webhook/seguranca/webhook-public-keys)
- [API de cobrança com subconta](https://developers.woovi.com/docs/charge/how-to-create-charge-with-subaccount-via-api)
- [Referência da API](https://developers.woovi.com/api-redoc)
