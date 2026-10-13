# H02 — Contas de teste, sandbox e staging

- **Pedido por:** T00 (pedir cedo, porque contas levam dias); obrigatório no início de T38.
- **Bloqueia:** T38 (homologação) e, por consequência, T39 e T40. Não bloqueia o desenvolvimento com fakes.
- **Quem responde:** dono do produto (contas de teste são dele, D0030 e D0031).

## Por que é necessário

Os adapters (T09, T10, T11) e o login Google (T04) são construídos contra fixtures e fakes. Só contas reais de teste provam o comportamento dos provedores, os webhooks e as capacidades que as decisões mandam verificar (README de decisões, "Pré-requisitos a verificar").

## O que o agente prepara antes de pedir

- `.env.example` completo com cada variável, descrição e onde obtê-la (sem valores).
- URLs exatas dos webhooks e redirects de staging (geradas por T12).
- Roteiro de homologação (`docs/operacao/homologacao.md`, T38) com os testes que serão rodados.

## Checklist para o humano

**Railway (staging)**
- [ ] Projeto `barbearia-staging` com Postgres, serviço `web` e serviço `worker` ligados ao repositório (ou acesso para o agente criar via CLI com token de projeto).
- [ ] Domínio público HTTPS do serviço web (subdomínio Railway serve).
- [ ] Variáveis de ambiente preenchidas no painel a partir do `.env.example`.

**Mercado Pago (conta do dono do produto, modo teste)**
- [ ] Aplicação criada; credenciais de teste (Public Key e Access Token) colocadas nas variáveis do Railway staging.
- [ ] Usuários de teste (vendedor e comprador) criados.
- [ ] Webhooks configurados para a URL de staging com os tópicos `payment`, `subscription_preapproval`, `subscription_authorized_payment` (e `topic_chargebacks_wh`/`topic_claims_integration_wh` se disponíveis); segredo de assinatura copiado para a variável.

**Woovi (conta CNPJ do dono do produto, ambiente de teste)**
- [ ] Ambiente de homologação/sandbox com **Pix Automático** habilitado.
- [ ] App ID/credencial na variável do Railway staging.
- [ ] Subconta de teste para simular a subconta da Barbearia do Moura.
- [ ] Webhook apontando para staging; segredo/mecanismo de verificação configurado.

**WhatsMiau (plano Starter, número de teste do dono do produto)**
- [ ] Instância criada e **pareada por QR Code** com o número de teste.
- [ ] API key e nome da instância nas variáveis (`WHATSAPP_OTP_*` e `WHATSAPP_AVISOS_*` apontando para a mesma instância no piloto).
- [ ] Webhook de mensagens recebidas apontando para staging (para SAIR).

**Google OAuth**
- [ ] Projeto no Google Cloud, tela de consentimento, Client ID/Secret.
- [ ] Redirect URIs de `localhost` e de staging cadastrados.

**Cloudflare R2**
- [ ] Bucket `barbearia-staging` (privado), chave de acesso com escopo no bucket, CORS liberando o domínio de staging para `PUT`.

**Verificações de capacidade (o agente executa e o humano ajuda quando exigir painel)**
- [ ] Mudar a data da próxima cobrança depois de pagamento atrasado (Mercado Pago e Woovi) — D0052.
- [ ] Consultar o instante de aprovação; devolver cobrança duplicada — D0052.
- [ ] Eventos de reversão e contestação recebidos por webhook — D0054.
- [ ] Programar troca de valor/recorrência na virada do ciclo — D0056.
- [ ] Faixa de dias aceita para a data de cobrança (29, 30, 31) — D0080.
- [ ] Cancelamento iniciado pelo pagador (app Mercado Pago / banco) chega ao app — D0021.
- [ ] Nome do recebedor exibido ao pagador no Pix Automático — D0030.

## Como entregar

Preencher as variáveis **direto no painel do Railway** (e, se quiser rodar local, no `.env.local` não versionado). Responder "H02 pronto" indicando quais itens foram feitos. Nunca colar chaves no chat.

## Critério de saída

T38 executa o roteiro: health check verde em staging; OTP real recebido no número de teste; login Google; upload/download R2; assinatura cartão aprovada em sandbox com webhook processado; autorização Pix Automático e cobrança em sandbox; cancelamento nos dois provedores refletido; cada capacidade marcada como **provada**, **não suportada** ou **parcial**, com evidência.

## Se alguma capacidade não existir

O agente **para** o ramo afetado e abre uma pergunta nova no H01 com alternativas (ex.: sem mudança de data no provedor → recriar recorrência na nova data). Não trocar de provedor nem mudar regra sem decisão.
