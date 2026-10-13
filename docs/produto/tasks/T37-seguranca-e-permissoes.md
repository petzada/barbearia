# T37 — Auditoria de segurança e permissões

| Campo | Valor |
|---|---|
| Fase | 9 |
| Iniciar após | T32, T33, T34, T35 |
| Concluir requer | — |
| Gate humano | — |
| Decisões | D0015, D0019, D0071, D0076 |
| PRD | §4.4, §7.3, §7.8, §8.2 (Acesso) |
| Área de escrita | `tests/security/**`, correções pontuais (cada correção fora de `tests/` é registrada e, se tocar regra de módulo, revisada pelo orquestrador) |
| Não tocar | Regras de negócio |
| Paralelizável com | T36 (fechamento) |

## Objetivo

Provar, com testes automatizados que ficam no repositório, que ninguém acessa o que não deve, que nenhuma server function está pública por esquecimento e que segredos e dados pessoais não vazam.

## Ler antes

PRD §4.4, §7.3, §7.8; código de rotas e construtores.

## Escopo

1. **Inventário automático** de server functions e rotas: política declarada, papel, auth recente, allowlist pública; relatório gerado em CI.
2. **Matriz de acesso** (testes parametrizados a partir da tabela §4.4): visitante, cliente A, cliente B, barbeiro X, barbeiro Y, admin, admin sem auth recente, ex-membro revogado — contra cada operação sensível (IDs de outro cliente, agenda de outro barbeiro, ganhos alheios, CRM, correções, fechamento, configurações, webhooks sem assinatura).
3. **CSRF e origem:** mutações sem token/origem válida recusadas; redirects só na allowlist.
4. **Segredos:** build do cliente não contém variáveis privadas; logs de teste não contêm OTP, token, telefone completo.
5. **Rate limits:** OTP, login, cotação, webhooks.
6. **Uploads:** tipos e tamanhos; chave fora do prefixo recusada.
7. **Dependências:** `pnpm audit` (ou equivalente) sem vulnerabilidades altas não justificadas.
8. **Cabeçalhos:** CSP adequada (permitindo SDK do Mercado Pago), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`.
9. Relatório com achados P0–P3; P0/P1 corrigidos nesta task (ou abertos como bloqueio para a task dona).

## Fora do escopo

Pentest externo (pode ser recomendado no relatório).

## Testes obrigatórios

Os itens 2–8 como suíte `pnpm test:security`, incluída no `verify`.

## Critérios de aceite

Suíte verde; nenhum P0/P1 aberto; inventário publicado.

## Entrega

Relatório (PRD §11.5) com o inventário e os achados.
