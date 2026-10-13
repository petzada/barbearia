# T26 — Inclusão de serviço durante o atendimento

> **Atualização 2026-10-13:** H01-Q1 respondido → [D0083](../../decisoes/0083-inclusao-de-servico-pelo-preco-avulso.md): inclusão paga o preço avulso vigente; combo só se o barbeiro/admin aplicar explicitamente e anotar o valor na conclusão. Substitui a aplicação automática do combo equivalente na inclusão.

| Campo | Valor |
|---|---|
| Fase | 6 |
| Iniciar após | T25, T18 |
| Concluir requer | — |
| Gate humano | **H01-Q1** (ramo: inclusão que forma combo com item de preço preservado) |
| Decisões | D0027, D0037, D0063, D0065, D0066, D0079 |
| PRD | RN10 (inclusão), RN14, §4.3 (B03) |
| Área de escrita | `src/modules/attendance/additions/**`, componente "incluir serviço" em `src/routes/equipe/atendimentos/**` |
| Não tocar | Cotação base (usa T13), ocupação (usa T14) |
| Paralelizável com | T21, T27 |

## Objetivo

O cliente marcou corte e pede barba na cadeira: o barbeiro inclui o serviço, o sistema verifica tempo livre logo depois e habilitação, calcula a parte avulsa com o preço vigente e registra o aceite do cliente. A visita continua sendo um uso.

## Ler antes

PRD RN10, RN14; D0079, D0065, D0066; H01-Q1.

## Escopo

1. **Comando `attendance.addService`** (barbeiro do atendimento ou admin), antes ou durante o atendimento (não depois do desfecho):
   - barbeiro habilitado para o serviço (e para o combo resultante, se houver);
   - **tempo:** duração adicional (arredondada à grade sobre o total da visita) cabe imediatamente após o fim atual; estender a ocupação na mesma transação (constraint); sem tempo → `ATTENDANCE.NO_TIME_FOR_ADDITION` e sugestão "marcar nova reserva";
   - **cobertura:** recalcular com T13 usando a mesma fonte de uso da visita (continua 1 uso); itens novos cobertos ou avulsos conforme o plano;
   - **preço:** serviço incluído pelo preço vigente; itens originais mantêm os preservados;
   - **combo equivalente:** se a combinação forma combo → ramo H01-Q1;
   - **aceite** da parte avulsa (canal `balcao`, registrador = barbeiro, hash da proposta) obrigatório;
   - grava `atendimento_itens_incluidos`, atualiza conta a receber (T25), evento `ServiceAdded`.
2. **UI:** em B03, "Incluir serviço" → escolher serviço → prévia (cobertura, valor avulso, novo horário de término) → "Cliente concorda" → confirmar.

## Fora do escopo

Correções após desfecho (T28).

## Contratos (publica)

`attendance.addService`, evento `ServiceAdded`.

## Regras e checklist defensivo

- Nunca reprecificar itens já reservados.
- Nunca consumir um segundo uso.
- Sem aceite registrado, a parte avulsa não entra.

## Testes obrigatórios

- PREMIUM marcou corte, inclui barba numa terça: combo coberto, 1 uso, sem cobrança.
- BLACK marcou corte, inclui barba: barba avulsa pelo preço vigente, aceite gravado.
- Sem tempo livre logo depois → rejeitado sem alterar nada.
- Barbeiro não habilitado para a barba → rejeitado.
- Avulso marcou corte (preço antigo) e inclui barba formando combo → ramo H01-Q1.

## 🛑 Handoff humano (H01-Q1)

Antes de implementar a precificação quando a inclusão **forma combo com um item de preço preservado diferente do vigente**, verificar H01-Q1.

- **Respondida:** implementar a opção escolhida (A, B ou C), aplicando a mesma regra às referências de comissão na visita coberta.
- **Não respondida:** **PARAR este ramo**: nesse caso específico `addService` recusa com `ATTENDANCE.COMBO_PRICING_PENDING_H01` (inclusões que não formam combo, ou que formam combo com preços iguais aos vigentes, funcionam); marcar `blocked_human (H01-Q1)` e enviar a mensagem padrão.

## Critérios de aceite

Inclusão funcionando nos casos sem lacuna; ramo da lacuna bloqueado de forma explícita e testada.

## Entrega

Relatório (PRD §11.5).
