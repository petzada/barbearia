# 0057 — Mudança de conta de pagamento exige migração validada

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q38
- **Substitui:** em [0030](0030-contas-dos-provedores-de-pagamento-por-fase.md), "a troca de conta é só de credenciais e configuração"

## Contexto
Não está demonstrado que as autorizações de recorrência e o histórico de cobranças acompanham a troca de credenciais. Trocar a conta só na configuração pode deixar assinaturas existentes sem cobrança ou com cobrança dupla.

## Decisão
- Antes de mudar de conta (ex.: Mercado Pago do dono do produto para o do dono da barbearia, ou Woovi própria da barbearia no futuro), **validar o procedimento suportado pelo provedor**.
- Se as autorizações não forem transferidas: **acompanhar as cobranças antigas até o fim** e **obter novas autorizações** quando necessário, **sem cobrança duplicada** e **sem perda de benefícios pagos**.
- A titularidade e o modelo de subconta da 0030 **não mudam**. O que muda é o tratamento da migração.

## Consequências
- A troca de conta Mercado Pago entre testes e produção acontece **antes de existir assinante real**, para não precisar de migração no go-live.
