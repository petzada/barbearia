# 0053 — Inadimplência revisada: suspensão só depois da cobertura paga; horários mantidos com escolha do cliente

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q04, Q45, Q46 e Q47
- **Substitui:** em [0018](0018-inadimplencia-suspende-e-reativa.md), a suspensão "na hora" na primeira recusa, o cancelamento automático dos horários 2 horas antes e a regra própria para horário a menos de 2 horas

## Contexto
A 0018 suspendia na primeira recusa, mesmo que o período já pago ainda não tivesse acabado, e cancelava os horários automaticamente 2 horas antes. Isso podia transformar uma reserva coberta em cobrança quando o cliente já não podia cancelar, e tratava aviso como se fosse aceite.

## Decisão
- **Benefício preservado até o fim do período efetivamente pago.** Recusa de cobrança antes disso gera **aviso e pendência**, não suspensão. A assinatura é **suspensa só quando a cobertura termina** sem novo pagamento aprovado. Sem carência gratuita.
- **Horários durante a suspensão não são cancelados automaticamente.** O cliente recebe aviso com **três opções**:
  1. **regularizar** a assinatura ([0052](0052-quitacao-unica-e-regularizacao-tardia.md));
  2. **manter como avulso**, com o preço explícito e **aceite**;
  3. **cancelar sem penalidade**.
- Se o cliente **chegar sem ter escolhido**, a equipe **informa o preço e obtém a concordância no balcão** antes do serviço.
- **Falta durante a suspensão** (sem ciclo pago): registrada **sem cobrança** e **sem consumir usos**, com histórico e sinalização ao admin. A regularização posterior libera os usos integrais do novo ciclo, sem desconto pela ausência.
- O mesmo tratamento vale quando a assinatura é **encerrada** com horários futuros: o encerramento não é aceite de cobrança avulsa.
- Continuam valendo da 0018: aviso no WhatsApp com botão "regularizar", retentativas do gateway ativas, reativação automática quando um pagamento é aprovado e cancelamento da assinatura quando as retentativas acabam.

## Consequências
- Sai o job que cancelava horários 2 horas antes por inadimplência.
- Horários mantidos durante a suspensão continuam contando nos limites de reserva ([0060](0060-limites-de-uso-e-de-reserva.md)).
- Crédito de reposição já pago ([0059](0059-credito-de-reposicao.md)) é outra situação, com regras próprias.
