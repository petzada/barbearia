# 0028 — Pagamento avulso também pelo app; o app é o hub da barbearia

- **Data:** 2026-10-13
- **Status:** substituída por [0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md): avulso pago só na barbearia; o app segue como hub
- **Substitui:** o "sem pagamento avulso pelo app" de [0013](0013-sem-avulso-assinatura-para-clientes-escolhidos.md) e de [0020](0020-cadastro-aberto-admin-gerencia-no-backoffice.md)

## Decisão
- O app da Barbearia do Moura é o **hub da barbearia**: o cliente tem uma conta, marca horários, assina planos e usa os benefícios, e paga o que for avulso.
- Serviço avulso (de cliente sem plano, ou a parte não coberta de um assinante) pode ser pago:
  - **no app**, por **Pix (QR Code via Woovi)** ou **cartão de crédito à vista via Mercado Pago**, sem assinatura; ou
  - **na barbearia**, como hoje.

## Consequências
- Além das assinaturas, as duas integrações passam a ter **cobrança única**: Pix imediato na Woovi e pagamento único de cartão no Mercado Pago (Checkout Transparente/Bricks, com o cartão tokenizado no campo seguro).
- Vale tudo de [0015](0015-tanstack-start-better-auth-drizzle.md): valor calculado só no servidor, status confirmado na API do gateway, webhook idempotente.
- Ainda em debate: quando o avulso é pago (antecipado ou depois do atendimento) e o estorno quando o cliente cancela.

## Revisão adversarial (2026-10-13)
- Já substituída pela 0029. Pagamento avulso nos gateways não foi reintroduzido. Revisada; sem alteração.
