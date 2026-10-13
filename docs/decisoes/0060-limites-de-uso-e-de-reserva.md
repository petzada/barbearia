# 0060 — Saldo de usos, limite de reservas do plano e limite geral por cliente

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q15 e Q16
- **Detalha:** [0026](0026-horarios-futuros-do-assinante.md), [0040](0040-acoes-do-admin-sobre-assinaturas.md)

## Contexto
Saldo de usos e limite de reservas são controles diferentes. Além disso, reservas avulsas sem limite contornavam o controle de ocupação, inclusive para assinantes.

## Decisão
- Existem **quatro controles distintos**:
  1. **saldo de usos** do ciclo ([0025](0025-uso-do-plano-ciclo-e-consumo.md));
  2. **limite de reservas de plano** simultâneas ([0026](0026-horarios-futuros-do-assinante.md));
  3. **limite geral de agendamentos futuros por cliente**, contando plano e avulso juntos, configurado pelo admin (novo; padrão **4**, [0081](0081-valores-padrao-de-limites-e-seguranca.md));
  4. **teto de assinaturas do plano** ([0061](0061-teto-de-assinaturas-por-plano.md)).
- O limite do plano continua valendo **dentro** do limite geral.
- **Uso extra** concedido pelo admin **aumenta o saldo**, **não o limite de reservas**. O cliente marca outra visita quando uma reserva existente deixar de ocupar o limite.
- **Não** se cria uma tela separada só para mostrar usos disponíveis e reservas permitidas por causa dessa regra.
- A **equipe pode ultrapassar o limite geral** ao marcar pelo balcão ([0034](0034-agendamento-feito-pela-barbearia.md)), com **justificativa registrada**.
