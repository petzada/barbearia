# 0026 — Horários futuros do assinante: até 4 por vez, até 30 dias à frente

- **Data:** 2026-10-13
- **Status:** aceita (inadimplência em [0053](0053-inadimplencia-revisada-reservas-mantidas.md); limites em [0060](0060-limites-de-uso-e-de-reserva.md))
- **Detalha:** [0022](0022-planos-barbearia-do-moura.md), [0025](0025-uso-do-plano-ciclo-e-consumo.md)

## Contexto
Restrição demais gera reclamação de propaganda enganosa (caso Wilker Castro, `docs/pesquisas/20-objecoes.md`). Liberdade demais pode travar os horários nobres. O dono do produto escolheu a liberdade máxima como padrão.

## Decisão
- Padrão da Barbearia do Moura: o assinante pode ter **até 4 horários de plano marcados ao mesmo tempo**, **até 30 dias à frente**.
- **Os dois números são configuráveis por plano** no backoffice.
- O uso conta no **ciclo da data do horário**. Um horário marcado para depois da próxima cobrança usa o ciclo seguinte.
- Se a renovação daquele ciclo falhar, os horários dele seguem a [0053](0053-inadimplencia-revisada-reservas-mantidas.md): ficam mantidos e o cliente escolhe regularizar, manter como avulso com aceite ou cancelar sem penalidade.

## Consequências
- Na hora de marcar, o app valida: horários futuros < limite do plano, data dentro da janela, usos restantes no ciclo daquela data, dia permitido pelo plano.
- Ponto a observar no piloto: se os horários nobres ficarem monopolizados por assinantes, reduzir o limite pelo backoffice.

## Revisão adversarial (2026-10-13)
- Mantida, ligada ao ciclo recalculado ([0052](0052-quitacao-unica-e-regularizacao-tardia.md)), aos limites separados ([0060](0060-limites-de-uso-e-de-reserva.md)), à inadimplência revista ([0053](0053-inadimplencia-revisada-reservas-mantidas.md)) e à reposição só de benefício pago ([0059](0059-credito-de-reposicao.md)).
