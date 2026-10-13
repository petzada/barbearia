# 0009 — Repasse aos barbeiros: sistema calcula, administrador paga e marca

- **Data:** 2026-10-13
- **Status:** aceita
- **Substitui:** o item "liberar pagamentos" de [0003](0003-escopo-funcional-por-perfil.md)

## Decisão
- O sistema **apenas calcula e registra** quanto cada barbeiro tem a receber.
- O **administrador paga por fora** (fora do app) e **marca como pago** no sistema.
- Não há split nem transferência automática.

## Consequências
- Os valores a receber precisam vir de lançamentos imutáveis: estorno ou ajuste vira um novo lançamento, nunca a edição do antigo. Fechamento mensal travado: ver [0041](0041-fechamento-mensal-de-comissoes.md).
- Regra de cálculo definida em [0023](0023-comissao-por-barbeiro-e-servico.md): matriz barbeiro × serviço com % avulso e % assinante sobre o valor cheio.

## Revisão adversarial (2026-10-13)
- Repasse manual mantido. Correções só pelo admin ([0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md)), ajustes no primeiro período aberto e repasses parciais ([0067](0067-fechamento-ajuste-no-periodo-aberto-e-repasse-parcial.md)), financeiro separado ([0068](0068-financeiro-separado-sem-lucro.md)).
