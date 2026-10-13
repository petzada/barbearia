# 0083 — Serviço incluído no atendimento paga o preço avulso; combo só por registro explícito

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** H01-Q1
- **Altera parcialmente:** [0079](0079-inclusao-de-servico-durante-o-atendimento.md) (aplicação automática do combo equivalente na inclusão)

## Contexto
D0066 preserva o preço do item reservado; D0079 mandava aplicar o combo equivalente (D0065) na inclusão. Não estava definido o valor quando o item reservado tem preço preservado diferente do vigente.

## Decisão
"Combo é valor definido de promoção pelo dono da barbearia." Serviço incluído no meio do atendimento é cobrado pelo **preço avulso vigente do serviço incluído**, não pelo combo. O combo só se aplica se o barbeiro/admin **decidir explicitamente e anotar o valor** ao registrar a conclusão do atendimento.

## Consequências
- Nenhuma conversão automática para combo na inclusão; o item original mantém o preço preservado.
- O registro da conclusão oferece a opção explícita "aplicar combo" com valor informado por quem registra (auditado).
- Em visita coberta, os valores de referência (base de comissão) seguem a mesma regra.
