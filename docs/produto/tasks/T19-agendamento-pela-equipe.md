# T19 — Agendamento pela equipe, encaixe e pré-cadastro

> **Atualização 2026-10-13:** INT-08 confirmada → [D0088](../../decisoes/0088-interpretacoes-int-01-a-13-confirmadas.md).

| Campo | Valor |
|---|---|
| Fase | 5 |
| Iniciar após | T17 |
| Concluir requer | T04 |
| Gate humano | Confirmação da INT-08 no H01 (não bloqueia a construção) |
| Decisões | D0034, D0051, D0060, D0063, D0070 |
| PRD | RN01 (pré-cadastro), RN03 (equipe), RN14, §5.15 (INT-08), §4.3 (B02, D03) |
| Área de escrita | `src/modules/scheduling/staff-booking/**`, rotas `src/routes/equipe/agenda/novo/**`, `src/routes/admin/agenda/novo/**` |
| Não tocar | Criação pelo cliente (T17) — reutilizar o mesmo serviço de criação com parâmetros de origem |
| Paralelizável com | T18, T20, T22, T25 |

## Objetivo

Trazer o balcão, o telefone e o WhatsApp do dono para dentro do sistema: barbeiro marca na própria agenda e admin em qualquer, para cliente existente ou novo (nome + telefone), com encaixe fora da grade e exceção ao limite geral justificada, sem jamais sobrepor horários.

## Ler antes

PRD RN01 (pré-cadastro), RN03, INT-08; D0034, D0051, D0060.

## Escopo

1. **Buscar cliente** (equipe): por nome ou telefone; retorno mínimo (nome, telefone mascarado, tem plano ativo?, reservas futuras). Sem CRM completo para barbeiro.
2. **Pré-cadastrar:** nome + telefone → `identity.createPreRegistered` (T04): telefone de conta existente reutiliza a conta (sem duplicar e sem revelar dados além do mínimo).
3. **Criar reserva pela equipe** reutilizando o serviço de T17 com `origem = equipe`:
   - barbeiro: só na própria agenda; admin: qualquer;
   - **encaixe:** início fora da grade e sem antecedência mínima permitido; ocupação continua sem sobreposição;
   - **fora da jornada (INT-08):** barbeiro não pode; admin pode, criando `excecoes_jornada` com motivo;
   - **limite geral:** se `checkLimits` falhar só no limite geral, a equipe pode prosseguir com **justificativa obrigatória** (gravada na reserva e na auditoria); saldo e limite de reservas do plano **não** podem ser excedidos;
   - cotação completa (T13) com cobertura do plano do cliente, como no app;
   - **parte avulsa:** aceite registrado pela equipe (canal `balcao`/`telefone`, registrador);
   - **"o cliente pediu este horário"**: confirmação obrigatória (D0051), gravada em `pedido_pelo_cliente` (habilita mensagens ao pré-cadastrado em T31);
   - nasce comprometida (encaixe em cima da hora) → aviso exibido e aceite registrado.
4. **Telas:** B02 (mobile, fluxo curto: cliente → serviços → horário/encaixe → revisão → confirmar); a mesma ação no D03 desktop para admin.
5. Evento `ReservationConfirmed` com `origem = equipe` (T31 envia confirmação conforme as regras do pré-cadastrado).

## Fora do escopo

Mensagens (T31), ativação do pré-cadastro (T04).

## Contratos (publica)

`staffBooking.searchClient`, `staffBooking.preRegister`, `staffBooking.create`.

## Regras e checklist defensivo

- O servidor confere que o barbeiro autenticado é o dono da agenda (nunca confiar no id enviado).
- Justificativa vazia ou genérica demais (< 10 caracteres) rejeitada.
- Telefone normalizado; pré-cadastro não envia nada até a reserva existir com `pedido_pelo_cliente = true`.

## Testes obrigatórios

- Barbeiro tenta marcar na agenda de outro → `AUTH.FORBIDDEN`.
- Encaixe 10:15 aceito; sobreposição rejeitada.
- Barbeiro fora da jornada rejeitado; admin com exceção registrada aceito.
- Quinta reserva futura com justificativa aceita; sem justificativa rejeitada; sem saldo do plano → avulso com aceite, nunca uso inventado.
- Pré-cadastro com telefone já existente reutiliza a conta.
- E2E: barbeiro faz encaixe de cliente novo pelo celular.

## Critérios de aceite

Fluxo B02 completo; regras de exceção provadas; auditoria com justificativa.

## Observação de handoff

INT-08 é interpretação adotada. Se o H01 rejeitá-la, ajustar a regra de jornada nesta task (mudança localizada em `staff-booking/policy.ts`).

## Entrega

Relatório (PRD §11.5).
