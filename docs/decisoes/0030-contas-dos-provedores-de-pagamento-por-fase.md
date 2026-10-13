# 0030 — Contas dos provedores de pagamento por fase

- **Data:** 2026-10-13
- **Status:** aceita (conta Woovi do dono do produto confirmada como definitiva para o Pix recorrente; migração de conta em [0057](0057-mudanca-de-conta-exige-migracao.md))
- **Substitui:** o trecho "uma conta só em cada gateway, ambas do dono" de [0008](0008-pagamentos-mercado-pago-cartao-woovi-pix.md)

## Contexto
A Barbearia do Moura tem CNPJ ativo, e a Woovi tem Pix Automático disponível na API (os dois confirmados pelo dono do produto em 13/10/2026). No review sobre usar a conta Woovi do dono do produto em produção, apareceram: exigência de CNPJ do recebedor, receita da barbearia caindo em conta de terceiro, nome de quem recebe aparecendo no extrato do cliente e o papel de intermediário na replicação.

## Decisão

| Provedor | Desenvolvimento e testes | Produção (MVP com clientes reais) |
|---|---|---|
| **Mercado Pago** (cartão recorrente) | Conta do dono do produto | **Conta do dono da Barbearia do Moura** |
| **Woovi** (Pix Automático) | Conta do dono do produto (CNPJ) | **Conta do dono do produto (CNPJ)**, com uma **subconta Woovi da Barbearia do Moura**, cadastrada manualmente no painel, que recebe os valores |

- A Barbearia do Moura pode **abrir conta Woovi própria depois**, se quiser. Até lá, vale a conta do dono do produto com subconta.
- A troca de conta não muda código ([0019](0019-um-codigo-varios-deploys-barbearia-id.md)), mas ~~é só de credenciais e configuração~~ → exige migração validada das assinaturas ([0057](0057-mudanca-de-conta-exige-migracao.md)).

## Riscos aceitos e cuidados
- No Pix Automático, a autorização e o extrato do cliente podem mostrar o **nome da empresa do dono do produto**, e não "Barbearia do Moura". O app deve avisar isso na tela de assinatura via Pix, para o cliente reconhecer a cobrança.
- Validação com contador: **dispensada pelo dono do produto**, que manteve a conta Woovi dele para receber o Pix recorrente como decisão final.
- Ao replicar para outras barbearias, decidir se o mesmo modelo de subconta se repete ou se cada barbearia abre a própria conta Woovi.

## Revisão adversarial (2026-10-13)
- Titularidade e subconta mantidas. A troca de conta exige migração validada ([0057](0057-mudanca-de-conta-exige-migracao.md)).
