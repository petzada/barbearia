# 0002 — Três perfis de usuário

- **Data:** 2026-10-13
- **Status:** aceita

## Contexto
Definição de quem usa o sistema.

## Decisão
Três perfis:
1. **Cliente**
2. **Barbeiro contratado**
3. **Administrador/gestor**, que **também pode atuar como barbeiro** (tem tudo do barbeiro + painel administrativo).

## Consequências
- Os perfis não são mutuamente exclusivos: uma mesma pessoa pode ser administrador e barbeiro ao mesmo tempo. O modelo de permissões precisa permitir papéis combinados.

## Revisão adversarial (2026-10-13)
- Três perfis e papéis combinados mantidos. Ações sensíveis exigem autenticação recente e a saída da equipe revoga o acesso na hora ([0071](0071-autenticacao-recente-para-acoes-sensiveis.md)).
