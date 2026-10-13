# 0065 — Combo equivalente aplicado automaticamente

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q21
- **Detalha:** [0033](0033-duracao-dos-servicos-e-grade-30-min.md), [0049](0049-combo-dividido-em-componentes.md)

## Contexto
Escolher o combo ou escolher exatamente os mesmos serviços separados daria preço, duração e comissão diferentes para o mesmo conjunto de serviços.

## Decisão
- Quando a seleção do cliente corresponde **exatamente** aos componentes de um combo cadastrado, o app **aplica o combo automaticamente** e **mostra o ajuste antes de confirmar**.
- Depois valem as regras de cobertura da [0049](0049-combo-dividido-em-componentes.md): combo inteiro coberto ou inteiro avulso usa os valores próprios; cobertura parcial usa preços e comissões dos componentes, com a duração do combo.

## Consequências
- Para a aplicação ser inequívoca, o cadastro **não aceita dois combos com exatamente os mesmos componentes**.
- O barbeiro precisa estar habilitado para o combo e seus componentes ([0037](0037-plano-vale-com-qualquer-barbeiro-e-habilitacao-por-servico.md)).
