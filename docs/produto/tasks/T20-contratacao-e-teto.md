# T20 — Contratação: checkout com cartão ou Pix, vaga temporária e teto

> **Atualização 2026-10-13:** H01-Q3 respondido → [D0085](../../decisoes/0085-uma-assinatura-por-cliente-troca-sem-teto.md): uma assinatura não encerrada por cliente; troca não disputa teto.

| Campo | Valor |
|---|---|
| Fase | 5 |
| Iniciar após | T16, T10, T11 |
| Concluir requer | T05 |
| Gate humano | **H01-Q3** (ramo: assinaturas simultâneas) |
| Decisões | D0004, D0008, D0020, D0025 (regras explícitas), D0030 (aviso do nome no Pix), D0061, D0062, D0081 |
| PRD | RN05, RN06, §5.15 (INT-03, INT-04), §4.3 (C04) |
| Área de escrita | `src/modules/subscriptions/checkout/**`, `src/modules/plans/capacity/**`, rotas `src/routes/app/planos/$id/assinar/**` |
| Não tocar | Núcleo de assinatura (T16), adapters (T10/T11) |
| Paralelizável com | T18, T19, T22, T25 |

## Objetivo

O cliente entende as regras do plano, escolhe cartão ou Pix e conclui a adesão sem que autorização, redirect ou clique sejam confundidos com pagamento. Planos com teto reservam vaga por 30 minutos e lidam corretamente com aprovação tardia.

## Ler antes

PRD RN05, RN06, INT-03/04; D0061; contratos de T10, T11 e T16.

## Escopo

1. **Capacidade do plano** (`plans/capacity`): `vagas_assinatura` (plano, cliente, checkout, criada_em, expira_em, estado `ativa`/`expirada`/`convertida`/`excedente`); ocupação = assinaturas `ativa` + `suspensa` (com retentativa possível) + `cancelada_no_fim_do_ciclo` + vagas ativas, somando versões; lock no plano para reservar; job de expiração no instante exato.
2. **Iniciar contratação** (`checkout.start`): valida elegibilidade (ramo H01-Q3), teto (sem vaga → `PLANS.CAPACITY_FULL`), reserva vaga (prazo da configuração, padrão 30 min), cria assinatura `pendente_ativacao` (T16) e a operação externa no provedor escolhido:
   - **cartão:** componente seguro de T10 gera `card_token`; servidor cria recorrência (`createRecurring` com `external_reference`);
   - **Pix:** cria a solicitação de recorrência na Woovi (T11) e devolve QR/link de autorização; mostrar o **nome do recebedor** que aparecerá para o pagador (D0030).
3. **Estados na tela:** aguardando pagamento/autorização (com prazo da vaga e relógio), autorização concedida aguardando cobrança, recusado (motivo seguro, tentar outro cartão), ativo (só após `SubscriptionActivated` de T16). Polling ou SSE da leitura de estado; nunca ativar pelo retorno do navegador.
4. **Aprovação tardia (INT-04):** pagamento aprovado depois da vaga expirada → reconferir capacidade sob lock; com vaga → converte; sem vaga → ativa como **excedente** registrado (auditoria + bloqueio de novas contratações até haver capacidade). Pagamento sem checkout correspondente → ocorrência (T22).
5. **Abandono:** vaga expira; assinatura `pendente_ativacao` sem autorização vira `nao_concluida` após prazo técnico; aprovação posterior ainda segue o item 4.
6. **Tela C04:** comparação dos planos com regras geradas dos dados (usos, dias, reservas simultâneas, janela, falta consome uso, cancelamento tardio, cancelamento da assinatura a qualquer momento com benefício até o fim do ciclo); escolha do meio; formulário de cartão; QR/link Pix com instruções; estados do item 3.
7. **Admin:** visão de ocupação por plano (usada em D06) e lista de excedentes.

## Fora do escopo

Quitação e ciclos (T16), cancelamento (T23), troca de plano (T24).

## Contratos (publica)

`checkout.start/status`, `capacity.occupancy(planoId)`, eventos `SeatReserved|Expired|Converted|Exceeded`.

## Regras e checklist defensivo

- Nunca enviar valor do plano a partir do cliente; servidor usa `plans.currentPrice`.
- Clique duplo em "assinar" → idempotência (uma assinatura, uma recorrência).
- Ao reabrir a tela com checkout em andamento, retomar o mesmo checkout (não criar outro).
- Dados do cartão jamais no servidor ou em logs.

## Testes obrigatórios

- Última vaga disputada por dois clientes → um reserva, outro recebe `CAPACITY_FULL`.
- Vaga expira em 30 min exatos; liberação permite outro cliente.
- Aprovação tardia com vaga → ativa; sem vaga → excedente registrado e novas contratações bloqueadas.
- Autorização Pix concedida sem cobrança liquidada → continua pendente.
- `back_url` com "approved" sem pagamento confirmado → continua pendente.
- Versões diferentes do mesmo plano somam no teto.
- E2E: assinatura por cartão (fake) e por Pix (fake) até ativa.

## 🛑 Handoff humano (H01-Q3)

Antes de implementar a **regra de elegibilidade** (cliente com assinatura não encerrada tentando contratar outra), verificar H01-Q3.

- **Respondida:** implementar a opção e seus testes.
- **Não respondida:** **PARAR este ramo**: `checkout.start` recusa com `SUBSCRIPTIONS.ELIGIBILITY_PENDING_H01` quando o cliente já tem assinatura não encerrada (comportamento conservador que não cria nada), marcar `blocked_human (H01-Q3)` e enviar a mensagem padrão. O restante da task segue.

## Critérios de aceite

Contratação completa com fakes; testes de concorrência do teto verdes; C04 funcional.

## Entrega

Relatório (PRD §11.5).
