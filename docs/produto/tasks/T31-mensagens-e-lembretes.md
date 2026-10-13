# T31 — Mensagens ao cliente, lembretes, pré-cadastrado e SAIR

| Campo | Valor |
|---|---|
| Fase | 5 |
| Iniciar após | T09, T17, T30 |
| Concluir requer | — |
| Gate humano | — (envio real em T38/H02) |
| Decisões | D0010, D0031, D0045, D0046, D0051, D0063, D0073, D0077 |
| PRD | RN12, RN13 (opt-out), §5.15 (INT-10) |
| Área de escrita | `src/modules/messaging/**` (templates, regras, lembretes, preferências, SAIR) |
| Não tocar | Adapter (T09), central (T30) |
| Paralelizável com | T18–T22, T25 |

## Objetivo

O cliente recebe pelo WhatsApp exatamente o que precisa, na hora certa e com informação verdadeira: confirmação, lembretes que conferem o estado atual da reserva, avisos essenciais de assinatura; o pré-cadastrado só recebe o que pediu; SAIR desliga só lembretes.

## Ler antes

PRD RN12, RN13; D0045, D0051, D0073, D0077.

## Escopo

1. **Templates versionados** por barbearia (textos na configuração de T08, com variáveis tipadas): confirmação de reserva, lembrete 24 h, lembrete 3 h (variante com prazo vigente e variante sem prazo), cancelamento pela casa (com link para remarcar e crédito), cancelamento tardio confirmado, transferência proposta (aceitar/recusar), escolha de cobertura, cobrança recusada, assinatura suspensa, regularizada, pedido de cancelamento (protocolo), cancelamento confirmado, troca programada/não efetivada, reajuste anunciado (valores, data, cancelar), reautorização Pix, migração de versão, exclusão de conta (data prevista), resposta automática ao SAIR. Links são deep links sem dados pessoais.
2. **Preferências:** `preferencias_comunicacao` (usuário, lembretes_ativos, alterado_por, canal, instante). Perfil (T32) e SAIR alteram; ativação do pré-cadastro preserva.
3. **Quem recebe o quê:**
   - transacionais e essenciais: sempre (D0046), para clientes ativos que aceitaram os termos;
   - lembretes: só se `lembretes_ativos`;
   - **pré-cadastrado:** apenas confirmação e lembretes de reservas com `pedido_pelo_cliente = true`, sempre com "ative sua conta" e "responda SAIR"; nada mais até ativar.
4. **Lembretes:** em `ReservationConfirmed`/`Rescheduled`, agendar jobs para início − 24 h e início − 3 h com `singletonKey = reserva:revisão:marco`; não agendar marco já passado. Em cancelamento/remarcação, cancelar jobs antigos (e, por segurança, o envio confere a revisão).
5. **Conferência no envio (D0077):** recarregar a reserva; cancelada ou passada → não envia; revisão diferente → não envia; lembretes desligados → não envia; prazo sem perda ainda vigente → texto com o prazo real (data/hora local); prazo vencido → só o lembrete do atendimento.
6. **SAIR:** handler de `InboundWhatsAppMessage` (T09): normalizar texto; "SAIR" (e variações acordadas: "sair", "parar") → `lembretes_ativos = false` para o telefone (usuário ativo ou pré-cadastrado) + resposta automática explicando que códigos e avisos essenciais continuam. Outras mensagens: sem resposta automática (ou orientação curta configurável), registradas.
7. **Entregas e falhas:** usa `entregas` de T09; falha de essencial → pendência do admin (T30) e reenvio; falha de reajuste → reenvio + pendência (INT-10).
8. **Central do cliente:** cada aviso essencial também cria notificação na central (T30).

## Fora do escopo

Push da equipe (T30), envio de OTP (T04).

## Contratos (publica)

`messaging.preferences.get/set`, handlers de eventos, `messaging.preview(template, dados)` para D11.

## Regras e checklist defensivo

- Nenhuma mensagem para quem não tem base (pré-cadastrado sem pedido; cliente sem aceite de termos), exceto OTP solicitado.
- Volume baixo; sem disparo em massa (reajuste para muitos assinantes é escalonado no tempo).
- Mensagens sem dados sensíveis além do necessário (primeiro nome, data, serviço).

## Testes obrigatórios

- Reserva criada 20 h antes → sem lembrete de 24 h; criada 2h30 antes → só confirmação.
- Remarcação: jobs antigos não enviam; novos agendados.
- Envio atrasado depois do prazo → variante sem prazo.
- Prazo de 4 h (configuração) e lembrete de 3 h → variante sem prazo.
- Reserva cancelada → lembrete não enviado.
- SAIR de pré-cadastrado → preferência preservada após ativação; códigos continuam chegando.
- Pré-cadastrado sem `pedido_pelo_cliente` → nada enviado.

## Critérios de aceite

Todos os templates com prévia em D11; testes com relógio controlado verdes.

## Entrega

Relatório (PRD §11.5) com os textos propostos (para revisão do humano no H06).
