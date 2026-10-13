# 0052 — Uma quitação por ciclo; pagamento atrasado inicia novo ciclo, sem retroatividade

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q01, Q02 e Q05 (`revisao-adversarial-consolidada.md`)
- **Detalha:** [0018](0018-inadimplencia-suspende-e-reativa.md), [0025](0025-uso-do-plano-ciclo-e-consumo.md)

## Contexto
Pagamento manual e retentativa do gateway podem aprovar a mesma mensalidade duas vezes. Se cada aprovação liberasse usos, o cliente pagaria em dobro e ganharia usos em dobro. Também não estava definido o que acontece com o ciclo quando o cliente paga atrasado, nem como tratar um avulso feito de manhã quando a mensalidade é aprovada à tarde.

## Decisão
- **Cada ciclo é uma obrigação com identidade própria.** Só **uma quitação por ciclo** libera os usos, venha ela da retentativa do gateway, de pagamento manual ou de outro provedor. **Cobrança duplicada do mesmo ciclo é devolvida.**
- **Pagamento atrasado inicia um novo ciclo mensal** a partir do pagamento: a **próxima cobrança muda** para essa data e a **cobertura dos horários já marcados é recalculada**. O cliente só tem benefícios com a assinatura regularizada; sem cobertura, o atendimento é avulso, com aceite ([0063](0063-notificacao-nao-e-aceite.md)).
- **Sem retroatividade:** vale o **instante de aprovação registrado pelo provedor**. Avulsos realizados antes mantêm receita e comissão. A mensalidade aprovada libera os **usos integrais** do novo ciclo. Webhook atrasado não muda o instante considerado.
- Uma aprovação duplicada **não vira nova mensalidade** só porque o ciclo mudou.

## Consequências
- Cada cobrança registrada no app aponta para o ciclo que ela quita. A segunda aprovação do mesmo ciclo vira devolução pendente para o admin.
- **A verificar nos provedores:** mudar a data de cobrança depois do atraso (Mercado Pago e Woovi), consultar o instante de aprovação e devolver cobrança duplicada.
- Renovação em dia que não existe no mês: último dia do mês ([0080](0080-renovacao-em-dia-inexistente.md)).
- O recálculo de horários nunca cobra em silêncio: perda de cobertura segue [0063](0063-notificacao-nao-e-aceite.md).
