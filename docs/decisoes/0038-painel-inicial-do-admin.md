# 0038 — Tela inicial do painel do admin no MVP

- **Data:** 2026-10-13
- **Status:** aceita (detalhada por [0068](0068-financeiro-separado-sem-lucro.md) e [0076](0076-central-de-notificacoes-e-gestao-no-desktop.md))

## Decisão
A tela inicial do admin responde a quatro perguntas, em quatro blocos:

1. **Assinaturas:** assinantes ativos, suspensos e cancelados por plano; receita recorrente mensal (MRR); novas assinaturas e cancelamentos no mês.
2. **Receita do mês:** entradas de assinaturas (Mercado Pago + Woovi) e de avulsos registrados no balcão, por forma de pagamento.
3. **Comissões a pagar:** quanto cada barbeiro tem a receber no período, quanto já foi pago e o que está pendente.
4. **Agenda e pendências:** ocupação de hoje e da semana por barbeiro, atendimentos passados sem confirmação (realizado/falta) e faltas recentes sinalizadas.

## Consequências
- Cada bloco leva à tela de detalhe correspondente (CRM de clientes, financeiro, comissões, agenda).
- Outros indicadores ficam para depois do MVP.
- A versão completa fica no backoffice desktop. No app mobile, a aba Gestão mostra os quatro blocos em cartões só de leitura ([0047](0047-app-mobile-e-backoffice-desktop.md)).

## Revisão adversarial (2026-10-13)
- Quatro blocos mantidos. Receita separada em recebido, pendente, devolvido e taxas, sem chamar de lucro ([0068](0068-financeiro-separado-sem-lucro.md)); pendências persistentes na central ([0076](0076-central-de-notificacoes-e-gestao-no-desktop.md)).
