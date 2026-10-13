# T38 — Staging e homologação das integrações

| Campo | Valor |
|---|---|
| Fase | 3+ (roda em paralelo às ondas de domínio assim que H02 chegar) |
| Iniciar após | T12, T09, T10, T11, T04 |
| Concluir requer | — |
| Gate humano | **H02** (parar no início) |
| Decisões | D0008, D0010, D0014, D0017, D0030, D0031, D0052, D0054, D0056, D0057, D0080 |
| PRD | §7.6, §10, README de decisões ("Pré-requisitos a verificar") |
| Área de escrita | `docs/operacao/homologacao.md`, ajustes em `src/integrations/**` (correções de contrato), `capabilities` dos adapters |
| Não tocar | Regras de negócio |
| Paralelizável com | ondas 3–8 |

## Objetivo

Subir o staging e provar, com contas reais de teste, o que até aqui só foi testado com fixtures: OTP real, login Google, R2, cartão recorrente no Mercado Pago, Pix Automático na Woovi, webhooks e cada capacidade que as decisões mandam verificar.

## Ler antes

[H02](../handoffs/H02-contas-de-teste-e-staging.md); READMEs de T09, T10, T11, T12; PRD §7.6.

## 🛑 Handoff humano (H02) — parar no início

**PARAR antes de qualquer chamada a provedor real.** Preparar e enviar o pedido H02 com: `.env.example` completo, URLs de webhook e redirect de staging, e o roteiro abaixo. Marcar `blocked_human (H02)`. Retomar quando o humano responder "H02 pronto" (no todo ou em parte: homologar o que estiver disponível e manter bloqueado o resto, item a item). Nunca pedir segredos no chat; confirmar só a presença e o funcionamento das variáveis.

## Escopo (após H02)

1. **Deploy de staging** seguindo `docs/operacao/deploy.md` (T12): web, worker, migrações, health verde, versão registrada.
2. **Roteiro de homologação** (`docs/operacao/homologacao.md`), executar e registrar evidência (ids, horários, prints sem dados sensíveis):
   - WhatsMiau: OTP real recebido; aviso real; mensagem "SAIR" recebida pelo webhook e processada; `health` correto; desconexão simulada gera alerta.
   - Google: primeiro login com verificação do WhatsApp; segundo login sem OTP.
   - R2: upload pré-assinado, confirmação, leitura assinada, remoção.
   - Mercado Pago: criar assinatura com cartão de teste; webhook verificado; primeira parcela aprovada → `SubscriptionActivated`; cartão recusado → recusa sem ativação; cancelar pela API e pelo painel do comprador (se possível) → reflexo; alteração de valor programada; refund.
   - Woovi: solicitação de recorrência + autorização em sandbox; cobrança liquidada → ativação; cancelamento pelo pagador → reflexo; refund; nome do recebedor exibido.
3. **Capacidades** (atualizar `capabilities` com `provado`/`nao_suportado`/`parcial` e evidência): mudar data da próxima cobrança (D0052), instante de aprovação, devolução de duplicata, eventos de reversão/contestação (D0054), programação de troca na virada (D0056), dias 29–31 (D0080), retentativas e sinal de esgotamento (D0018), migração entre contas (D0057 — apenas documentar o procedimento suportado).
4. **Ajustes** nos adapters para divergências encontradas (com testes de contrato atualizados a partir de fixtures reais sanitizadas).

## Regras e checklist defensivo

- Só contas de **teste**; nunca credenciais de produção.
- Capacidade **não suportada** que uma regra exige → **PARAR o ramo** e abrir pergunta nova no H01 com alternativas (nunca trocar provedor ou regra por conta própria).

## Critérios de aceite

Roteiro executado com evidência; capacidades atualizadas; ramos sem capacidade claramente bloqueados com pergunta aberta; staging estável para T39.

## Entrega

Relatório (PRD §11.5) + `docs/operacao/homologacao.md` preenchido.
