# H01 — Decisões residuais de produto

- **Pedido por:** T00 (o quanto antes).
- **Bloqueia:** apenas os ramos indicados em cada pergunta. O resto das tasks segue.
- **Quem responde:** dono do produto.
- **Depois de responder:** cada resposta vira uma decisão `docs/decisoes/NNNN-*.md` (a partir de 0082), entra no índice, e o orquestrador atualiza o [PRD](../PRD-MVP.md), as tasks e os testes afetados.

As 81 decisões não fecham por inteiro os pontos abaixo. O agente **não** implementa esses ramos com valor inventado. Para cada pergunta há opções, impacto e uma recomendação; responder com a letra basta.

---

## Parte A — Lacunas (bloqueiam ramos)

### H01-Q1 — Serviço incluído que forma combo com item de preço preservado (bloqueia ramo de T26)

**Contexto.** D0066 preserva o preço do item reservado. D0079 manda usar o preço vigente na inclusão e aplicar o combo equivalente (D0065). Exemplo: corte reservado a R$ 50; hoje corte R$ 60, barba R$ 40, combo corte+barba R$ 85. O cliente inclui barba.

| Opção | Regra | Cliente paga no exemplo | Base de comissão |
|---|---|---|---|
| **A (recomendada)** | Visita passa a ser o combo; item original mantém R$ 50; inclusão vale `max(0, combo vigente − preço preservado do original)` | R$ 85 (50 + 35) | original R$ 50; inclusão R$ 35 |
| B | Combo só é aplicado se nenhum item tiver preço preservado diferente do vigente; senão, inclusão pelo preço avulso do componente | R$ 90 (50 + 40) | 50 e 40 |
| C | Inclusão com desconto proporcional do combo: `preço do componente × (combo ÷ soma vigente dos componentes)` | R$ 84 (50 + 34) | 50 e 34 |

Para visita **coberta** (PREMIUM marcou corte e inclui barba), a regra escolhida vale para os **valores de referência** (base de comissão de assinante), sem cobrança. Se o combo vigente for menor que o preço preservado, a inclusão vale 0 e nada é devolvido.

### H01-Q2 — Reservas de plano acima do saldo e ordem de consumo (bloqueia ramo de T15/T16)

**Contexto.** Pagamento atrasado inicia um novo ciclo (D0052). Reservas que estavam em ciclos diferentes podem cair no mesmo ciclo e passar dos 4 usos. Também não está definido se, havendo crédito de reposição e saldo do ciclo, o app usa qual primeiro.

**Parte 1 — excesso no mesmo ciclo**

| Opção | Regra |
|---|---|
| **A (recomendada)** | Ficam cobertas as reservas mais **próximas no tempo** até o saldo; as excedentes abrem **escolha de cobertura** (avulso com aceite ou cancelar sem penalidade) |
| B | Ficam cobertas as reservas **criadas primeiro** |
| C | O cliente escolhe quais ficam cobertas; até escolher, todas ficam pendentes de escolha |

**Parte 2 — crédito × saldo do ciclo**

| Opção | Regra |
|---|---|
| **A (recomendada)** | Usar primeiro o direito que **vence antes**; a revisão da reserva mostra qual foi usado |
| B | Sempre o saldo do ciclo primeiro; crédito só quando o ciclo não cobre |
| C | O cliente escolhe na revisão |

### H01-Q3 — Assinaturas simultâneas e teto na troca de plano (bloqueia ramo de T20/T24)

**Contexto.** As decisões não dizem se um cliente pode ter duas assinaturas ao mesmo tempo, nem se a troca de plano disputa o teto do plano de destino.

| Opção | Regra |
|---|---|
| **A (recomendada)** | No máximo **uma assinatura não encerrada** por cliente (pendente, ativa, suspensa ou cancelada no fim do ciclo). Quem cancelou só contrata de novo depois do fim do ciclo (a tela informa a data). Suspenso regulariza ou espera o encerramento. A **troca** reserva vaga no plano de destino ao ser programada; sem vaga, a troca fica indisponível; a vaga do plano antigo só é liberada na efetivação |
| B | Uma assinatura por cliente, mas a troca **não** disputa teto (pode ultrapassar) |
| C | Várias assinaturas permitidas (exige regras extras de consumo; não recomendado) |

### H01-Q4 — Como regularizar uma mensalidade atrasada (bloqueia ramo de T16/T21; depende também de H02)

**Contexto.** D0018 e D0053 prevêem o botão "regularizar" e "pagamento manual", mas não dizem o meio. D0029 proíbe cobrança **avulsa de serviço** em gateway; a mensalidade não é avulso.

| Opção | Regra |
|---|---|
| **A (recomendada)** | **Cartão:** cliente atualiza o cartão no fluxo seguro do Mercado Pago e o app pede nova tentativa da parcela (ou o meio que H02 provar). **Pix:** cobrança Pix imediata na Woovi ligada à **mesma obrigação**, mantendo a autorização recorrente. Admin **não** quita mensalidade por clique |
| B | Só retentativas automáticas do provedor + atualizar cartão / reautorizar Pix; sem cobrança imediata |
| C | Como A, e também permitir ao admin registrar mensalidade paga no balcão (dinheiro/maquininha) com motivo e auth recente |

### H01-Q5 — Devolver uso consumido de um ciclo que já acabou (bloqueia ramo de T28)

**Contexto.** D0040 permite ao admin "devolver um uso consumido" (ex.: falta justificada). Se o ciclo daquele uso já terminou, o uso devolvido expiraria na hora.

| Opção | Regra |
|---|---|
| **A (recomendada)** | "Devolver" só enquanto o ciclo de origem estiver vigente. Depois disso, a tela oferece "conceder uso extra" no ciclo atual (exige assinatura ativa) |
| B | Devolução de ciclo encerrado vira automaticamente uso extra no ciclo atual |
| C | Devolução de ciclo encerrado vira crédito de 30 dias |

### H01-Q6 — Comissão negativa depois de repasse (bloqueia ramo de T29)

**Contexto.** Uma correção (ex.: realizado → falta) depois que o mês já foi pago gera ajuste negativo no primeiro período aberto (D0067). Se o período aberto não tiver lançamentos suficientes, o total fica negativo.

| Opção | Regra |
|---|---|
| **A (recomendada)** | O ajuste negativo aparece no extrato com a origem. Se o total do período ficar negativo, o fechamento mostra "saldo a compensar" e o **admin escolhe** no fechamento: carregar para o próximo período ou registrar como acertado fora do app (com motivo). Nunca desconto automático silencioso |
| B | Sempre carregar automaticamente para o próximo período |
| C | Não abater: ajuste negativo fica só informativo, acerto sempre fora do app |

---

## Parte B — Interpretações adotadas (confirmar em lote)

O agente constrói com estas leituras (PRD §5.15). Responder "confirmo todas" ou indicar as rejeitadas.

| ID | Interpretação | Confirma? |
|---|---|---|
| INT-01 | Uso "comprometido" é derivado do relógio (agora ≥ prazo congelado); o job só registra a transição | ☐ |
| INT-02 | Reserva coberta em ciclo ainda não pago é "previsão"; se a casa cancelar, libera sem crédito | ☐ |
| INT-03 | Sem o primeiro ciclo pago, a cotação é avulsa | ☐ |
| INT-04 | Pagamento aprovado de checkout iniciado no app sempre ativa (com vaga ou como excedente registrado); pagamento sem checkout vira ocorrência | ☐ |
| INT-05 | Assinatura suspensa: só reservas avulsas novas; crédito de reposição válido continua utilizável | ☐ |
| INT-06 | Transferência sem resposta: reserva fica com o barbeiro original; se ele não puder atender, a casa cancela (crédito se pago) | ☐ |
| INT-07 | Cancelamento voluntário: no próprio fluxo o cliente escolhe, por reserva de plano depois do fim do ciclo, manter como avulso (com preço e aceite) ou cancelar. Cancelamento pelo admin ou por retentativas esgotadas mantém as reservas com escolha pendente | ☐ |
| INT-08 | Encaixe: barbeiro só dentro da própria jornada (fora da grade pode); admin pode marcar fora da jornada como exceção registrada | ☐ |
| INT-09 | Cliente marca avulso até 30 dias à frente (configurável) | ☐ |
| INT-10 | Os 30 dias do reajuste contam do aviso registrado no app; falha no WhatsApp gera reenvio e não é aceite | ☐ |
| INT-11 | Atendimento com crédito de reposição gera comissão de assinante sobre a referência preservada | ☐ |
| INT-12 | Financeiro mostra bruto e, quando o provedor informar, taxa e líquido; senão, rótulo "taxas não informadas" | ☐ |
| INT-13 | Assinante sem saldo no ciclo, ou com o limite de reservas de plano atingido, pode marcar a visita como avulsa (motivo explícito e aceite); o limite geral continua valendo | ☐ |

## Critério de saída

Cada pergunta respondida (letra ou texto) e cada INT confirmada ou rejeitada; decisões novas registradas em docs/decisoes; PRD e tasks atualizados; registro em [registro.md](registro.md).

## Se não houver resposta

Os ramos listados ficam `blocked_human (H01-Qn)`. As tasks entregam todo o resto e documentam exatamente o ponto de extensão onde a regra entrará. Interpretações não confirmadas continuam valendo para construção, mas o go-live (T40) exige a confirmação.
