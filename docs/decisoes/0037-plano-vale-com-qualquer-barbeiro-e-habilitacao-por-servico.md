# 0037 — Plano vale com qualquer barbeiro; a matriz define quem faz cada serviço

- **Data:** 2026-10-13
- **Status:** aceita
- **Detalha:** [0023](0023-comissao-por-barbeiro-e-servico.md)

## Decisão
- **O plano vale com qualquer barbeiro** da casa.
- Na matriz **barbeiro × serviço** (a mesma dos percentuais de comissão), o admin marca **quais serviços cada barbeiro faz**.
- Na marcação, só aparecem, para cada serviço, os **barbeiros habilitados**. Numa visita com vários serviços, o barbeiro precisa estar habilitado para todos.

## Consequências
- Cada célula da matriz tem: habilitado (sim/não), % avulso e % assinante.
- Barbeiro novo começa sem nenhum serviço habilitado, até o admin configurar.

## Revisão adversarial (2026-10-13)
- Habilitação mantida. Filtro por barbeiro respeita a habilitação para todos os serviços ([0074](0074-filtro-opcional-por-barbeiro.md)); combo e componentes em [0065](0065-combo-equivalente-automatico.md).
