# 0044 — Equipe recebe Web Push; clientes recebem WhatsApp

- **Data:** 2026-10-13
- **Status:** aceita
- **Detalha:** [0010](0010-whatsapp-via-whatsmiau.md), [0031](0031-whatsmiau-planos-e-numeros-por-fase.md)

## Contexto
Mandar avisos internos pelo WhatsApp aumentaria o volume do número único do piloto (mais risco de ban) e poluiria o WhatsApp pessoal dos barbeiros.

## Decisão
- **Barbeiro e admin** recebem avisos por **Web Push do PWA**: novo agendamento, cancelamento, bloqueio criado, assinatura suspensa, atendimentos pendentes de confirmação.
- **Instalar o PWA é obrigatório para a equipe**, com tela guiada (no iPhone, o push só funciona com o app adicionado à tela inicial).
- **Clientes** recebem lembretes e avisos **só por WhatsApp** no MVP. Não há pedido de permissão de push ao cliente.

## Revisão adversarial (2026-10-13)
- Canais mantidos (push para equipe, WhatsApp para clientes). Central de notificações por perfil, com pendências persistentes ([0076](0076-central-de-notificacoes-e-gestao-no-desktop.md)). Cancelamento tardio também notifica a equipe ([0058](0058-ciclo-de-vida-da-reserva-e-prazos.md)).
