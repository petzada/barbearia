# T09 — Adapter WhatsMiau (NotificationProvider) e webhook de entrada

| Campo | Valor |
|---|---|
| Fase | 2 |
| Iniciar após | T03 |
| Concluir requer | — |
| Gate humano | — (instância real é homologada em T38/H02) |
| Decisões | D0010, D0017, D0031, D0051, D0073 |
| PRD | RN12, §7.6 |
| Área de escrita | `src/integrations/whatsmiau/**`, rota `src/routes/api/webhooks/whatsmiau/**`, tabela `entregas` (em `src/integrations/whatsmiau/schema.ts` ou módulo indicado em T02) |
| Não tocar | Templates de mensagem e regras de envio (T31), OTP (T04) |
| Paralelizável com | T06, T08, T10, T11, T12 |

## Objetivo

Implementar o `NotificationProvider` para WhatsApp via WhatsMiau Cloud (`POST /v2/message/sendText/:instance`), com dois canais lógicos (`otp`, `avisos`) configuráveis, registro de entregas e recebimento de mensagens (para SAIR), atrás de uma interface trocável.

## Ler antes

D0010, D0031; documentação WhatsMiau (https://whatsmiau.dev/docs/getting-started); PRD §7.6.

## Escopo

1. **Envio:** `send({ canal, telefoneE164, texto, chaveIdempotente })` → resolve instância pelo canal (`WHATSAPP_OTP_INSTANCE`, `WHATSAPP_AVISOS_INSTANCE`, API key), chama a API com timeout, mapeia resposta para `enviado`/`falha_transitoria`/`falha_permanente`, devolve id externo.
2. **Entregas:** tabela `entregas` (canal, destinatário mascarado + hash do telefone, template, chave idempotente única, estado `pendente/enviado/falhou/confirmado`, tentativas, id externo, erro). Avisos usam `runExternalOperation` (T03) e retentativas; OTP é síncrono (usuário esperando), sem retentativa automática silenciosa.
3. **Webhook de entrada:** verificação do segredo/token configurado, persistência no inbox (T03), parse de mensagem recebida (telefone, texto, instante) e de status de entrega se disponível; publica evento `InboundWhatsAppMessage` para T31 tratar SAIR.
4. **Capacidades e saúde:** função `health()` (instância conectada? se a API oferecer) usada por D11 e por alertas (T36): número desconectado/banido vira incidente.
5. **Fake conforme:** implementação em memória que passa na **mesma suíte de contrato** do adapter real.
6. **Fixtures sanitizadas** de requisição/resposta; testes de contrato.

## Fora do escopo

Texto das mensagens e regras de quem recebe (T31); push (T30).

## Contratos (publica)

`NotificationProvider` WhatsApp, `FakeWhatsAppProvider`, evento `InboundWhatsAppMessage`, `whatsapp.health`.

## Regras e checklist defensivo

- Telefone validado E.164 antes de enviar; nunca logar telefone completo nem texto de OTP.
- Volume baixo: limitador simples por instância (configurável) para evitar rajadas (risco de ban, D0010).
- 4xx de configuração (instância inexistente, chave inválida) → `falha_permanente` + pendência de integração, sem loop.
- Webhook sem token válido → 401 e nada persistido.

## Testes obrigatórios

- Contrato: envio ok, timeout, 429 com retry-after, 5xx, 4xx permanente; idempotência pela chave.
- Webhook: assinatura inválida rejeitada; mensagem duplicada persistida uma vez; mensagem "SAIR", "sair", " Sair " normalizada no evento.
- Fake e real (com fixtures) passam na mesma suíte.

## Critérios de aceite

Adapter e fake publicados; T04 consegue enviar OTP pelo fake; documentação de variáveis no `.env.example`.

## Entrega

Relatório (PRD §11.5).
