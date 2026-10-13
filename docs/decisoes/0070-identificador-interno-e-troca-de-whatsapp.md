# 0070 — Identificador interno permanente; WhatsApp obrigatório e verificado; troca de número

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q06 e Q07
- **Substitui:** em [0017](0017-login-whatsapp-otp-e-google.md), "telefone é a identidade única da conta"

## Contexto
Ter um número hoje não prova identidade histórica. Troca de número, número reutilizado por outra pessoa ou erro de cadastro poderiam ligar histórico e assinatura à pessoa errada.

## Decisão

### Identidade
- A conta tem um **identificador interno permanente**.
- O **WhatsApp continua obrigatório, verificado** e usado para acesso. Ele também evita conta duplicada.
- **Troca de número:** preserva assinatura e histórico, desde que o cliente **entre na conta existente** e **verifique o número novo**.
- **Sem acesso à conta:** a recuperação passa por **conferência assistida** pela barbearia, **sem transferir histórico** só porque alguém tem a posse do número.

### Como funciona o login (esclarecimento da 0017)
- **WhatsApp cadastrado é obrigatório para todo cliente.**
- Quem usa **Google** confirma o WhatsApp por código **na primeira vinculação** e depois **entra pelo Google sem repetir o código**.
- Quem usa **só WhatsApp** pede código **a cada novo login**, não a cada abertura do app enquanto a sessão for válida.
- Incentivo para vincular o Google: **continua não aprovado**.
- **Limitação aceita:** sem Google vinculado e sem sessão válida, o acesso depende do código no WhatsApp. Não há outro canal de autenticação.

## Consequências
- O pré-cadastro da [0034](0034-agendamento-feito-pela-barbearia.md) é ligado ao identificador interno, e o número é verificado na ativação.
- O procedimento de conferência assistida e a proteção contra número reutilizado serão detalhados no PRD.
