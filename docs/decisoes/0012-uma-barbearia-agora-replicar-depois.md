# 0012 — Uma barbearia agora, replicar para 3–5 depois, SaaS só após validar

- **Data:** 2026-10-13
- **Status:** aceita (forma de replicar definida em [0019](0019-um-codigo-varios-deploys-barbearia-id.md))

## Decisão
1. **Agora:** o sistema atende só a Barbearia do Moura.
2. **Validação:** replicar para **3 a 5 barbearias locais**, **cada uma com seu próprio banco** e com identidade visual e provedores de pagamento próprios, mantendo a mesma arquitetura.
3. **Depois de validar:** virar um produto vendido para várias barbearias (estilo "AppBarber").

## Consequências
- O código não pode ter marca, cores, textos ou credenciais da Barbearia do Moura fixos: tudo vem de configuração.
- Gateways de pagamento ficam atrás de uma interface (adapter), porque cada barbearia pode usar provedores diferentes.
- ~~A forma de replicar está em debate~~ → [0019](0019-um-codigo-varios-deploys-barbearia-id.md): um código só, um deploy por barbearia, `barbearia_id` desde já.

## Revisão adversarial (2026-10-13)
- Estratégia mantida, com versões liberadas por etapas ([0078](0078-versoes-por-etapas-e-recuperacao-com-conciliacao.md)).
