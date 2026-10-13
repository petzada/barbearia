# 0075 — Sem login: planos, benefícios, serviços e barbeiros; horários só com login

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q29
- **Substitui:** em [0048](0048-onboarding-planos-sem-login-resto-com-login.md), "sem login, o cliente só explora as telas de planos e benefícios"

## Contexto
Sem saber quais serviços existem e quem atende, o cliente não consegue avaliar a oferta antes de criar conta. A proposta de abrir também os horários foi aprovada só em parte.

## Decisão
- **Sem login**, o app mostra: **benefícios, planos, serviços prestados e a lista de barbeiros**.
- **Não** mostra dias nem horários disponíveis.
- **Com login:** fluxo de agendamento (serviço, profissional e horário) e contratação de plano.
- A navegação pública da [0043](0043-onboarding-boas-vindas-e-explorar-sem-login.md) **não** é restaurada por inteiro.

## Consequências
- Continuam valendo da 0048 as telas de boas-vindas e suas regras de exibição.
