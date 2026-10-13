# 0076 — Central de notificações e pendências por perfil; gestão sensível só no desktop

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q30 e Q31
- **Detalha:** [0038](0038-painel-inicial-do-admin.md), [0044](0044-push-para-equipe-whatsapp-para-clientes.md), [0047](0047-app-mobile-e-backoffice-desktop.md)

## Contexto
Aviso que ninguém viu não pode ser o único registro de algo que exige ação. Também foi proposto levar correções e devoluções de uso para o celular do admin, e a proposta foi recusada.

## Decisão

### Central de notificações
- A tela inicial do **cliente**, do **barbeiro** e do **admin** tem um **botão de notificações** com o que é relevante para cada perfil.
- **Push é só aviso.** Uma **pendência continua aberta até ser resolvida**, mesmo que a notificação tenha sido aberta.
- A central do cliente **não** significa push para clientes: o canal externo dele continua sendo o WhatsApp ([0044](0044-push-para-equipe-whatsapp-para-clientes.md)).

### Gestão sensível no desktop
- **Decisões sensíveis e de gestão** (correção de atendimento, devolução ou concessão de uso, repasses, configurações) ficam **no backoffice desktop**.
- O app mobile do admin oferece **visualização rápida, insights e indicadores**, e mantém as **ações de agenda** já previstas na 0047 (cancelar horário, marcar encaixe).
