# 0073 — SAIR desliga só os lembretes opcionais

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q11
- **Substitui:** em [0051](0051-mensagens-para-cliente-pre-cadastrado.md), "responder SAIR desliga as mensagens daquele telefone"

## Contexto
Desligar tudo impediria o login por código. Continuar mandando tudo contrariaria a promessa de saída.

## Decisão
- Responder **SAIR** desliga **só os lembretes opcionais** ([0045](0045-lembretes-24h-e-3h-antes.md)), o mesmo efeito do opt-out no Perfil ([0046](0046-lgpd-aceite-opt-out-e-exclusao.md)).
- A resposta automática **explica** que continuam: **códigos solicitados** e **avisos essenciais** de agendamentos e assinatura.
- A preferência **permanece** depois que o pré-cadastro é ativado.

## Consequências
- É uma escolha funcional, não parecer jurídico sobre comunicações.
