# T18 — Cancelar, remarcar, cancelamento pela casa, transferência e crédito de reposição

| Campo | Valor |
|---|---|
| Fase | 5 |
| Iniciar após | T17 |
| Concluir requer | — |
| Gate humano | — |
| Decisões | D0032, D0058, D0059, D0063, D0069, D0044 (aviso à equipe) |
| PRD | RN04, RN14, §5.15 (INT-06), §4.3 (C03, B01, D03) |
| Área de escrita | `src/modules/scheduling/reservations/{cancel,reschedule,house,transfer}/**`, extensão de resolução de conflito em `schedule` (ponto deixado por T14), rotas `src/routes/app/reservas/$id/**`, ações em `src/routes/equipe/agenda/**` e `src/routes/admin/agenda/**` |
| Não tocar | Criação (T17), escolhas de cobertura (T21) |
| Paralelizável com | T19, T20, T22, T25 |

## Objetivo

Fechar o ciclo de vida da reserva antes do atendimento: cancelamento do cliente dentro e fora do prazo, remarcação segura, cancelamento pela casa com crédito de reposição, transferência de barbeiro com concordância e resolução dos conflitos de jornada.

## Ler antes

PRD RN04 (tabela de eventos), RN14, INT-06; D0058, D0059, D0063, D0069.

## Escopo

1. **Cancelar pelo cliente** (`reservations.cancelByClient`, `expectedRevision`): antes de `cancel_deadline` → `cancelada_cliente`, `entitlements.release`; em/depois → **pede confirmação explícita** (a UI mostra "o uso comprometido não volta") → `cancelada_tardia`, `entitlements.consumeLate`. Avulso: sem custo em ambos. Libera ocupação na hora. Depois do início: proibido (`SCHEDULING.ALREADY_STARTED`). Evento `ReservationCancelled` com tipo (T30 avisa equipe, inclusive tardio; T31 confirma ao cliente).
2. **Remarcar** (`reservations.reschedule`): nova cotação + revisão mostrando a consequência da antiga (no prazo: uso volta; tardio: uso consumido e nova reserva precisa de nova fonte); numa transação: criar a nova (mesmas validações de T17) e só então cancelar a antiga; se a nova falhar, a antiga permanece intacta. Evento `ReservationRescheduled` (T31 invalida lembretes antigos).
3. **Cancelar pela casa** (admin; ou resolução de conflito; ou transferência recusada): `cancelada_barbearia`; `entitlements.substituteWithCredit` (pago → crédito 30 dias; crédito → mesmo crédito reiniciado; previsão → liberada sem crédito); aviso ao cliente com link para remarcar (evento para T31).
4. **Transferência de barbeiro** (admin): cria proposta `transferencia_pendente` (novo barbeiro habilitado e livre; ocupação do novo barbeiro reservada provisoriamente) e evento para T31 pedir concordância; respostas: **aceite** pelo cliente no app (C03) ou registrado pela equipe (canal `balcao`/`telefone`, RN14) → troca de barbeiro e libera a ocupação antiga; **recusa** → cancelamento pela casa (item 3); **sem resposta** (INT-06) → mantém o barbeiro original enquanto ele puder atender; se não puder (motivo registrado), o admin cancela pela casa.
5. **Resolução de conflitos de jornada** (preenche o ponto de extensão de T14): por conflito, "transferir" (item 4) ou "cancelar pela casa" (item 3), além do "manter como exceção" já existente.
6. **Crédito em uso:** reservas cobertas por crédito seguem as mesmas operações (as regras de devolução/reinício estão em T15).
7. **Telas:** C03 (detalhe com cancelar/remarcar, banners de transferência pendente com aceitar/recusar); ações em B01/D03 (admin: cancelar pela casa com motivo, transferir); barbeiro **não** cancela pela casa (pede ao admin).

## Fora do escopo

Escolhas de cobertura por inadimplência/troca (T21/T24), desfecho (T25).

## Contratos (publica)

`cancelByClient`, `reschedule`, `cancelByHouse`, `proposeTransfer`, `respondTransfer`, eventos `ReservationCancelled{tipo}`, `ReservationRescheduled`, `ReservationTransferProposed|Accepted|Declined`.

## Regras e checklist defensivo

- `agora` vem do `Clock`; comparação com o prazo congelado da reserva, nunca com a configuração atual.
- Cancelar duas vezes → idempotente (mesmo resultado), sem segundo movimento de direito.
- Transferência nunca move a reserva sem aceite registrado.
- Toda ação da casa exige motivo e gera auditoria.

## Testes obrigatórios

- Cancelar 1 s antes do prazo (uso volta), no instante exato e 1 s depois (tardio).
- Tardio libera o horário na hora (outro cliente consegue marcar) e notifica equipe.
- Remarcação cuja nova reserva falha mantém a original sem alteração.
- Remarcação depois do prazo consome o uso antigo e exige nova fonte.
- Casa cancela: pago → crédito; previsão → sem crédito; crédito → reiniciado; nunca dois direitos.
- Transferência: aceite pelo app; aceite pela equipe com canal; recusa vira cancelamento pela casa com crédito; sem resposta mantém.
- Conflito de jornada resolvido com cada uma das três opções.

## Critérios de aceite

Ciclo de vida pré-atendimento completo com testes; telas C03 e ações de agenda funcionais.

## Entrega

Relatório (PRD §11.5).
