# T30 — Central de notificações, pendências e Web Push da equipe

| Campo | Valor |
|---|---|
| Fase | 2 |
| Iniciar após | T03, T04, T05 |
| Concluir requer | — |
| Gate humano | — (chaves VAPID de produção em H05) |
| Decisões | D0044, D0071 (revogação), D0076 |
| PRD | RN12 (equipe, central), §4.3 (N01, B05), §6.2 (notificações) |
| Área de escrita | `src/modules/notifications/**`, `src/integrations/web-push/**`, rotas `src/routes/app/notificacoes/**`, `src/routes/equipe/notificacoes/**`, `src/routes/equipe/instalar/**` |
| Não tocar | Mensagens WhatsApp ao cliente (T31) |
| Paralelizável com | T06–T12 |

## Objetivo

Toda informação que exige atenção fica num lugar persistente por perfil: notificações (lidas ou não) e **pendências** que só fecham quando o problema é resolvido. A equipe recebe Web Push no PWA instalado; o cliente vê a central, sem push.

## Ler antes

PRD RN12, §4.3 (N01, B05); D0044, D0076.

## Escopo

1. **Modelo:** `notificacoes` (destinatário, papel de contexto, tipo, título, corpo curto sem PII sensível, recurso, criada_em, lida_em), `pendencias` (dono: usuário ou papel `admin`, tipo, recurso, condição de resolução, aberta_em, resolvida_em, resolvida_por/motivo), `push_subscriptions` (usuário, endpoint, chaves, user-agent resumido, ativo, último sucesso/erro).
2. **API para os módulos:** `notify(destinatarios, tipo, recurso, dados)`; `openPending(tipo, recurso, dono)` idempotente; `resolvePending(tipo, recurso, motivo)` chamado pelo módulo dono da condição (ex.: T25 resolve "atendimento sem desfecho" ao registrar o desfecho).
3. **Regras de roteamento da equipe** (push + central): novo agendamento (barbeiro da reserva; admin), cancelamento e cancelamento tardio, bloqueio criado (admin), assinatura suspensa (admin), atendimentos pendentes de desfecho (barbeiro; resumo diário), falhas de integração e ocorrências (admin), escolhas de cobertura sem resposta perto do horário (barbeiro da reserva).
4. **Web Push:** chaves VAPID por ambiente (geradas por script; produção guardada em H05); envio com payload mínimo (tipo + id; o conteúdo vem da central ao abrir); remoção de assinaturas inválidas (404/410); retentativa curta; `TeamRoleRevoked` desativa as assinaturas do usuário na hora.
5. **Instalação guiada (B05):** detecção de plataforma (iOS Safari: "Compartilhar → Adicionar à Tela de Início"; Android/Chrome: prompt de instalação), permissão de notificação só depois de instalado no iOS, botão "enviar push de teste", estado (instalado, permissão, último push entregue). Equipe sem PWA instalado vê banner persistente.
6. **Central (N01):** lista por perfil/contexto, filtro não lidas/pendências abertas/resolvidas, contador no botão do topo (slot de T05), deep link para o recurso; abrir não resolve pendência.
7. **Cliente:** a central do cliente lista avisos e pendências dele (escolhas de cobertura, aceites, reautorização Pix, transferência proposta); **nenhum** pedido de permissão de push ao cliente.

## Fora do escopo

WhatsApp ao cliente (T31), conteúdo das pendências de cada módulo (cada módulo abre/resolve as suas).

## Contratos (publica)

`notifications.notify`, `pending.open/resolve/listFor`, `push.subscribe/unsubscribe/test`, evento `PendingOpened|Resolved`.

## Regras e checklist defensivo

- Payload de push sem nome de cliente, telefone ou valores.
- Pendência só fecha por `resolvePending` do módulo dono (nunca por leitura).
- Assinatura push de um usuário sem papel de equipe é recusada.

## Testes obrigatórios

- Abrir notificação não fecha pendência; resolver a condição fecha.
- `openPending` idempotente.
- Revogar papel desativa push e esconde a central de equipe.
- Endpoint 410 removido.
- Cliente nunca recebe pedido de permissão de push.
- E2E: barbeiro instala (simulado), ativa push e recebe teste; central mostra novo agendamento.

## Critérios de aceite

Central e push funcionais com fake de push em teste e real em navegador local; instalação guiada para iOS e Android documentada com prints.

## Entrega

Relatório (PRD §11.5).
