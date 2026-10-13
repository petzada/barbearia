# T24 — Troca de plano, migração de versão, reajuste e troca de recorrência

> **Atualização 2026-10-13:** H01-Q3 respondido → [D0085](../../decisoes/0085-uma-assinatura-por-cliente-troca-sem-teto.md): a troca **não** reserva vaga nem disputa teto do plano de destino.

| Campo | Valor |
|---|---|
| Fase | 7 |
| Iniciar após | T21, T22 |
| Concluir requer | T07 |
| Gate humano | **H01-Q3** (ramo: troca para plano com teto cheio); capacidades em T38/H02 |
| Decisões | D0039, D0040, D0042, D0050, D0056, D0062, D0063 |
| PRD | RN09, RN14, §5.15 (INT-10), §4.3 (C05, D02, D06) |
| Área de escrita | `src/modules/subscriptions/changes/**`, `src/modules/plans/price-adjustments/**`, rotas `src/routes/app/plano/{trocar,reajuste,migracao}/**`, `src/routes/admin/planos/$id/{reajuste,migracao}/**`, ação "agendar troca" em `src/routes/admin/clientes/$id/**` |
| Não tocar | Núcleo (T16), adapters |
| Paralelizável com | T23, T28, T29 |

## Objetivo

Mudar plano, versão ou preço sem cobrança proporcional, sem duas cobranças no mesmo ciclo e sem mudar a cobertura de ninguém em silêncio. Uma única recorrência é responsável pela próxima cobrança, e a troca só é "programada" depois que o provedor confirma.

## Ler antes

PRD RN09, RN14, INT-10; D0039, D0042, D0050, D0056, D0062, D0063; capacidades de T10/T11.

## Escopo

1. **Troca de plano** (`trocas_plano`: origem, destino, versão destino, estado `proposta`/`aguardando_autorizacao`/`programada`/`efetivada`/`nao_efetivada`/`falhou`/`desistida`, data efetiva = início do próximo ciclo):
   - **proposta:** cliente (ou admin "agendar", D0040) escolhe destino; a tela lista as reservas do próximo ciclo cuja cobertura muda e os preços; o **cliente** escolhe por reserva (avulso com aceite ou cancelar sem penalidade) — o agendamento do admin fica `proposta` até essas escolhas;
   - **cartão:** operação externa para alterar valor/plano na data correta (capacidade provada) → `programada` só com confirmação;
   - **Pix:** cria nova autorização (T11) e mostra QR; `aguardando_autorizacao` até o pagador autorizar; autorizado → programa a substituição para a virada; a autorização antiga só é cancelada **depois** da nova confirmada; sem autorização até a data → `nao_efetivada`, segue no plano antigo, aviso, e as reservas que haviam mudado voltam às regras antigas (nova escolha se a cobertura mudar, T21 causa `troca_nao_efetivada`);
   - **virada:** no início do ciclo, a assinatura passa a apontar o plano/versão destino; `SubscriptionTimeline` (T16) projeta ciclos futuros com a versão programada;
   - ramo **H01-Q3** para teto do destino.
2. **Migração de versão** (`migracoes_versao`): admin publica convite de migração para assinantes de uma versão antiga; o assinante vê diferenças e reservas afetadas e **aceita** (aceite com hash) ou ignora (permanece na versão). Sem aceite, nada muda.
3. **Reajuste de preço** (`reajustes`, `avisos_reajuste` por assinante): admin define novo preço → para cada assinante, data efetiva = primeira renovação ≥ 30 dias após o **aviso registrado no app** (INT-10); aviso no app + WhatsApp (T31) com valor antigo, novo, data e "cancelar"; falha de WhatsApp → reenvio + pendência, não é aceite.
   - **cartão:** alterar o valor no provedor na data correta (operação programada; nunca alterar um "template" que reajuste todos de uma vez antes de suas datas);
   - **Pix:** pedir reautorização; sem reautorização até a data → `cancelada_no_fim_do_ciclo` via T23 (solicitante `reajuste_sem_autorizacao`).
4. **Uma recorrência responsável:** `recorrencias.responsavel_pela_proxima`; invariantes que impedem duas recorrências ativas responsáveis pela mesma obrigação; se acontecer duplicidade financeira, T22 devolve.
5. **Telas:** C05 trocar plano / aceitar migração / ver reajuste e reautorizar Pix; D06 reajuste e migração; D02 agendar troca.

## Fora do escopo

Cancelamento (T23), núcleo de cobrança (T16).

## Contratos (publica)

`planChange.propose/confirm/status`, `versionMigration.invite/accept`, `priceAdjustment.schedule/status`, eventos `PlanChangeScheduled|Effective|NotEffective`, `PriceAdjustmentAnnounced`, `VersionMigrationAccepted`.

## Regras e checklist defensivo

- Sem proporcional, nunca.
- "Programada" só com confirmação do provedor; falha → pendência visível ao cliente e ao admin.
- Aviso enviado não é aceite; aceite sempre com hash da proposta.

## Testes obrigatórios

- Troca PREMIUM → GOLD com reservas de sábado no próximo ciclo: escolhas por reserva antes de confirmar.
- Pix sem nova autorização: troca não efetivada, reservas voltam e escolhas reabertas se necessário.
- Reajuste: assinante com renovação em 20 dias recebe o novo preço só na renovação seguinte (≥ 30 dias).
- Reajuste Pix sem reautorização → cancelada no fim do ciclo.
- Nunca duas cobranças no mesmo ciclo durante a troca de recorrência.
- Migração sem aceite mantém a versão antiga; com aceite muda no próximo ciclo.

## 🛑 Handoff humano (H01-Q3)

Antes de implementar a regra de **teto do plano de destino** na troca, verificar H01-Q3.

- **Respondida:** implementar a opção.
- **Não respondida:** **PARAR este ramo**: trocas para planos **com teto configurado** recusam com `SUBSCRIPTIONS.CHANGE_CAPACITY_PENDING_H01`; trocas para planos sem teto funcionam; marcar `blocked_human (H01-Q3)` e enviar a mensagem padrão.

## Critérios de aceite

Fluxos completos com fakes e capacidades simuladas; pendências claras quando a capacidade não está provada.

## Entrega

Relatório (PRD §11.5).
