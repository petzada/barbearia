# Registro de decisões — Barbearia do Moura

Aqui ficam **apenas decisões tomadas por humano** (o dono do produto). Recomendações da IA que ainda não foram aprovadas ficam na seção "Em aberto" até alguém decidir.

## Formato

Um arquivo por decisão: `NNNN-titulo-curto.md`, com:

- **Data**, **Status** (`aceita`, `substituída por NNNN`, `revogada`)
- **Contexto**: por que surgiu a questão
- **Decisão**: o que foi decidido, em uma ou duas frases
- **Consequências**: o que isso implica ou descarta

Para mudar uma decisão, não edite a antiga: crie uma nova e marque a antiga como `substituída por NNNN` (ou `parcialmente substituída`). Na antiga, a frase que mudou fica ~~riscada~~ com link para a nova.

## Documentos de guia

- `README.md` (este arquivo): índice, pendências e pré-requisitos.
- [`revisao-adversarial-consolidada.md`](revisao-adversarial-consolidada.md): registro das 51 perguntas (Q01–Q51) da revisão adversarial. Foi **incorporado** nas decisões 0052 a 0078; cada decisão de 0001 a 0051 tem uma seção "Revisão adversarial" dizendo o que mudou.
- `docs/pesquisas/`: pesquisas de mercado e concorrentes.

## Índice

| # | Decisão | Data | Status |
|---|---------|------|--------|
| [0001](0001-produto-web-mobile-first-estilo-app.md) | Produto 100% web, mobile-first, com experiência de app nativo e sem landing page | 2026-10-13 | aceita, parcialmente substituída por 0047 |
| [0002](0002-tres-perfis-de-usuario.md) | Três perfis: cliente, barbeiro e administrador (que também pode ser barbeiro) | 2026-10-13 | aceita |
| [0003](0003-escopo-funcional-por-perfil.md) | Escopo funcional inicial por perfil | 2026-10-13 | aceita, parcialmente substituída por 0009, 0029 e 0032 |
| [0004](0004-assinatura-recorrente-cartao-e-pix.md) | Assinatura recorrente via cartão e Pix recorrente, paga dentro do app | 2026-10-13 | aceita, detalhada por 0008 |
| [0005](0005-processo-debate-antes-de-construir.md) | Debater e registrar decisões antes de construir | 2026-10-13 | aceita |
| [0006](0006-monolito-typescript-tailwind-postgres.md) | Monolito em TypeScript + Tailwind + Postgres | 2026-10-13 | aceita |
| [0007](0007-storage-cloudflare-r2.md) | Arquivos no Cloudflare R2 | 2026-10-13 | aceita |
| [0008](0008-pagamentos-mercado-pago-cartao-woovi-pix.md) | Mercado Pago para cartão, Woovi para Pix Automático, conta única, sem split | 2026-10-13 | aceita |
| [0009](0009-repasse-manual-aos-barbeiros.md) | Repasse: sistema calcula, admin paga por fora e marca como pago | 2026-10-13 | aceita |
| [0010](0010-whatsapp-via-whatsmiau.md) | WhatsApp via WhatsMiau desde o MVP (risco aceito), dois números dedicados: códigos e lembretes | 2026-10-13 | aceita |
| [0011](0011-cancelamento-ate-2h-antes.md) | Cancelamento até 2h antes | 2026-10-13 | substituída por 0058 |
| [0012](0012-uma-barbearia-agora-replicar-depois.md) | Uma barbearia agora, replicar para 3–5 depois, SaaS após validar | 2026-10-13 | aceita, detalhada por 0019 |
| [0013](0013-sem-avulso-assinatura-para-clientes-escolhidos.md) | Sem pagamento avulso no app; assinatura só para habilitados | 2026-10-13 | substituída por 0020 e 0029 |
| [0014](0014-hospedagem-railway.md) | Tudo no Railway (app, Postgres, worker); Supabase fora | 2026-10-13 | aceita |
| [0015](0015-tanstack-start-better-auth-drizzle.md) | TanStack Start + Better Auth + Drizzle, com regras de segurança no servidor | 2026-10-13 | aceita |
| [0016](0016-fila-de-jobs-pg-boss.md) | Fila de jobs com pg-boss atrás de interface própria; Redis só se precisar | 2026-10-13 | aceita |
| [0017](0017-login-whatsapp-otp-e-google.md) | Login por código de 6 dígitos no WhatsApp, Google como reserva, telefone como identidade, sessão de 90 dias | 2026-10-13 | aceita, identidade substituída por 0070 |
| [0018](0018-inadimplencia-suspende-e-reativa.md) | Inadimplência: benefício suspenso na hora, horários reservados até 2h antes, reativa sozinho | 2026-10-13 | parcialmente substituída por 0053 |
| [0019](0019-um-codigo-varios-deploys-barbearia-id.md) | Um código, um deploy Railway por barbearia, config por barbearia, UUID e `barbearia_id` desde já | 2026-10-13 | aceita, versões por etapas em 0078 |
| [0020](0020-cadastro-aberto-admin-gerencia-no-backoffice.md) | Cadastro e assinatura abertos a qualquer cliente; admin gerencia no backoffice (CRM) | 2026-10-13 | aceita, sujeita a 0060 e 0061 |
| [0021](0021-cliente-cancela-assinatura-sozinho.md) | Cliente cancela a assinatura sozinho pelo app; benefício vale até o fim do ciclo pago | 2026-10-13 | aceita, detalhada por 0055 e 0072 |
| [0022](0022-planos-barbearia-do-moura.md) | Planos BLACK, GOLD LIMITADO e PREMIUM | 2026-10-13 | aceita, teto em 0061 e versões em 0062 |
| [0023](0023-comissao-por-barbeiro-e-servico.md) | Comissão: matriz barbeiro × serviço com % avulso e % assinante sobre o valor cheio | 2026-10-13 | aceita, detalhada por 0064 e 0066 |
| [0024](0024-falta-nao-consome-uso-e-sinaliza-admin.md) | Falta não consome uso do plano e sinaliza o admin no CRM | 2026-10-13 | substituída por 0025 |
| [0025](0025-uso-do-plano-ciclo-e-consumo.md) | Uso do plano: ciclo de cobrança, sem acúmulo, uso consumido se realizado ou não cancelado até 2h antes; falta sinaliza admin | 2026-10-13 | aceita, detalhada por 0052 e 0058 |
| [0026](0026-horarios-futuros-do-assinante.md) | Assinante: até 4 horários de plano por vez, até 30 dias à frente (configurável por plano) | 2026-10-13 | aceita, inadimplência em 0053 |
| [0027](0027-cobertura-do-plano-e-parte-avulsa.md) | 1 visita coberta = 1 uso; o que não é coberto vira avulso, mostrado antes de confirmar | 2026-10-13 | aceita |
| [0028](0028-pagamento-avulso-no-app.md) | Avulso pago no app (Pix Woovi ou cartão Mercado Pago) ou na barbearia | 2026-10-13 | substituída por 0029 |
| [0029](0029-avulso-presencial-e-confirmacao-de-atendimento.md) | Avulso pago só na barbearia; todo atendimento confirmado pelo barbeiro/admin (realizado ou falta), o que dispara uso e comissão | 2026-10-13 | aceita, parcialmente substituída por 0064 |
| [0030](0030-contas-dos-provedores-de-pagamento-por-fase.md) | Mercado Pago: conta do dono do produto em teste, do dono da barbearia em produção. Woovi: conta (CNPJ) do dono do produto com subconta da barbearia | 2026-10-13 | aceita, migração em 0057 |
| [0031](0031-whatsmiau-planos-e-numeros-por-fase.md) | WhatsMiau Starter com 1 número no piloto; Pro com 2 números após validar (risco aceito) | 2026-10-13 | aceita |
| [0032](0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md) | Jornada definida pelo admin; bloqueio pontual pelo barbeiro, só em horário livre | 2026-10-13 | aceita, detalhada por 0059, 0063 e 0069 |
| [0033](0033-duracao-dos-servicos-e-grade-30-min.md) | Duração por serviço (igual para todos), grade de 30 min | 2026-10-13 | aceita |
| [0034](0034-agendamento-feito-pela-barbearia.md) | Barbeiro e admin marcam em nome do cliente; cliente novo pré-cadastrado pelo telefone; encaixe fora da grade | 2026-10-13 | aceita, mensagens em 0051, identidade em 0070 |
| [0035](0035-antecedencia-minima-2h.md) | Cliente marca pelo app com pelo menos 2h de antecedência | 2026-10-13 | parcialmente substituída por 0058 |
| [0036](0036-fluxo-de-marcacao-horario-primeiro.md) | Marcação: serviço → horário → barbeiro livre; sugere o mais próximo; sem filtro de barbeiro | 2026-10-13 | aceita, filtro opcional em 0074 |
| [0037](0037-plano-vale-com-qualquer-barbeiro-e-habilitacao-por-servico.md) | Plano vale com qualquer barbeiro; matriz barbeiro × serviço define quem faz o quê | 2026-10-13 | aceita |
| [0038](0038-painel-inicial-do-admin.md) | Tela inicial do admin: assinaturas, receita do mês, comissões a pagar, agenda e pendências | 2026-10-13 | aceita, detalhada por 0068 e 0076 |
| [0039](0039-troca-de-plano-no-proximo-ciclo.md) | Troca de plano vale no próximo ciclo, sem proporcional | 2026-10-13 | aceita, Pix em 0050, aceite em 0063 |
| [0040](0040-acoes-do-admin-sobre-assinaturas.md) | Admin cancela, devolve/concede uso e agenda troca de plano; pausa fora do MVP | 2026-10-13 | aceita |
| [0041](0041-fechamento-mensal-de-comissoes.md) | Fechamento mensal de comissões com período travado; atrasos viram ajuste no mês seguinte | 2026-10-13 | parcialmente substituída por 0067 |
| [0042](0042-reajuste-de-plano-para-todos-com-30-dias.md) | Reajuste de plano vale para todos, com 30 dias de aviso; Pix sem reautorização cancela | 2026-10-13 | aceita |
| [0043](0043-onboarding-boas-vindas-e-explorar-sem-login.md) | Boas-vindas puláveis, explorar sem login, conta ao confirmar | 2026-10-13 | substituída por 0048 |
| [0044](0044-push-para-equipe-whatsapp-para-clientes.md) | Equipe recebe Web Push (PWA obrigatório); clientes só WhatsApp | 2026-10-13 | aceita |
| [0045](0045-lembretes-24h-e-3h-antes.md) | Lembretes: confirmação, 24h antes e 3h antes (antes do limite de cancelamento) | 2026-10-13 | aceita, conteúdo em 0077 |
| [0046](0046-lgpd-aceite-opt-out-e-exclusao.md) | LGPD: aceite registrado, opt-out de lembretes, exclusão com anonimização | 2026-10-13 | aceita, exclusão substituída por 0072 |
| [0047](0047-app-mobile-e-backoffice-desktop.md) | App mobile para cliente e barbeiro; backoffice desktop para o admin; aba Gestão com resumo no mobile | 2026-10-13 | aceita, detalhada por 0076 |
| [0048](0048-onboarding-planos-sem-login-resto-com-login.md) | Boas-vindas com planos, benefícios e login; sem login só planos e benefícios; agendar e o resto exigem login | 2026-10-13 | parcialmente substituída por 0075 |
| [0049](0049-combo-dividido-em-componentes.md) | Combo com só parte coberta é dividido em componentes (preço e comissão por componente) | 2026-10-13 | aceita |
| [0050](0050-pix-sem-nova-autorizacao.md) | Pix sem nova autorização: troca de plano não acontece; reajuste cancela no fim do ciclo | 2026-10-13 | aceita |
| [0051](0051-mensagens-para-cliente-pre-cadastrado.md) | Pré-cadastrado só recebe mensagens do horário que pediu, com ativação e SAIR | 2026-10-13 | aceita, SAIR em 0073 |
| [0052](0052-quitacao-unica-e-regularizacao-tardia.md) | Uma quitação por ciclo; pagamento atrasado inicia novo ciclo, sem retroatividade | 2026-10-13 | aceita |
| [0053](0053-inadimplencia-revisada-reservas-mantidas.md) | Inadimplência: suspensão só após o período pago; horários mantidos com escolha do cliente; sem cancelamento automático | 2026-10-13 | aceita |
| [0054](0054-pagamento-revertido-ou-contestado.md) | Pagamento revertido ou contestado: suspende o restante, sem cobrança retroativa nem estorno automático de comissão | 2026-10-13 | aceita |
| [0055](0055-pedido-de-cancelamento-com-protocolo.md) | Pedido de cancelamento com protocolo; cobrança de ciclo iniciado depois do pedido é devolvida | 2026-10-13 | aceita |
| [0056](0056-troca-de-recorrencia-programada.md) | Troca de recorrência programada para a próxima renovação, sem duas cobranças no ciclo | 2026-10-13 | aceita |
| [0057](0057-mudanca-de-conta-exige-migracao.md) | Mudança de conta de pagamento exige migração validada | 2026-10-13 | aceita |
| [0058](0058-ciclo-de-vida-da-reserva-e-prazos.md) | Ciclo da reserva (reservado → comprometido → desfecho); cancelamento tardio; prazos configuráveis e guardados por reserva | 2026-10-13 | aceita |
| [0059](0059-credito-de-reposicao.md) | Crédito de reposição de 30 dias quando a barbearia cancela benefício já pago | 2026-10-13 | aceita |
| [0060](0060-limites-de-uso-e-de-reserva.md) | Saldo de usos, limite de reservas do plano e limite geral por cliente são controles distintos | 2026-10-13 | aceita |
| [0061](0061-teto-de-assinaturas-por-plano.md) | Teto opcional de assinaturas por plano, com reserva temporária de vaga | 2026-10-13 | aceita |
| [0062](0062-versoes-de-plano.md) | Versões de plano preservam benefícios contratados; migração com aceite | 2026-10-13 | aceita |
| [0063](0063-notificacao-nao-e-aceite.md) | Notificação não é aceite: avulso, troca de plano, migração e troca de barbeiro exigem concordância | 2026-10-13 | aceita |
| [0064](0064-atendimento-e-pagamento-separados-correcao-pelo-admin.md) | Atendimento realizado e pagamento separados; correção só pelo admin, com histórico | 2026-10-13 | aceita |
| [0065](0065-combo-equivalente-automatico.md) | Combo equivalente aplicado automaticamente | 2026-10-13 | aceita |
| [0066](0066-valores-preservados-na-reserva.md) | Preço avulso e valor de referência preservados na reserva; percentual da data do atendimento | 2026-10-13 | aceita |
| [0067](0067-fechamento-ajuste-no-periodo-aberto-e-repasse-parcial.md) | Fechamento: ajuste no primeiro período aberto e repasses parciais | 2026-10-13 | aceita |
| [0068](0068-financeiro-separado-sem-lucro.md) | Financeiro separa recebido, pendente, devolvido e comissões; não chama de lucro | 2026-10-13 | aceita |
| [0069](0069-jornada-e-duracao-nao-alteram-reservas.md) | Mudança de jornada ou duração não altera reservas em silêncio | 2026-10-13 | aceita |
| [0070](0070-identificador-interno-e-troca-de-whatsapp.md) | Identificador interno permanente; WhatsApp obrigatório e verificado; troca de número | 2026-10-13 | aceita |
| [0071](0071-autenticacao-recente-para-acoes-sensiveis.md) | Autenticação recente para ações sensíveis; saída da equipe revoga acesso na hora | 2026-10-13 | aceita |
| [0072](0072-exclusao-de-conta-no-fim-do-periodo.md) | Exclusão de conta concluída no fim do ciclo pago ou do crédito de reposição | 2026-10-13 | aceita |
| [0073](0073-sair-desliga-so-lembretes.md) | SAIR desliga só os lembretes opcionais | 2026-10-13 | aceita |
| [0074](0074-filtro-opcional-por-barbeiro.md) | Filtro opcional por barbeiro na marcação | 2026-10-13 | aceita |
| [0075](0075-conteudo-publico-servicos-e-barbeiros.md) | Sem login: planos, benefícios, serviços e barbeiros; horários só com login | 2026-10-13 | aceita |
| [0076](0076-central-de-notificacoes-e-gestao-no-desktop.md) | Central de notificações e pendências por perfil; gestão sensível só no desktop | 2026-10-13 | aceita |
| [0077](0077-lembretes-conferem-estado-da-reserva.md) | Lembretes conferem o estado atual da reserva antes de enviar | 2026-10-13 | aceita |
| [0078](0078-versoes-por-etapas-e-recuperacao-com-conciliacao.md) | Versões liberadas por etapas; recuperação inclui conciliação com os provedores | 2026-10-13 | aceita |
| [0079](0079-inclusao-de-servico-durante-o-atendimento.md) | Barbeiro inclui serviço durante o atendimento; parte avulsa com aceite; preço da inclusão | 2026-10-13 | aceita |
| [0080](0080-renovacao-em-dia-inexistente.md) | Renovação em dia inexistente vai para o último dia do mês; fuso da barbearia | 2026-10-13 | aceita |
| [0081](0081-valores-padrao-de-limites-e-seguranca.md) | Padrões: limite geral 4, reserva de vaga 30 min, autenticação recente 1 hora | 2026-10-13 | aceita |
| [0082](0082-ambiente-sem-docker-postgres-railway.md) | Desenvolvimento e testes sem Docker, em bancos separados do Postgres Railway | 2026-10-13 | aceita |
| [0083](0083-inclusao-de-servico-pelo-preco-avulso.md) | Serviço incluído paga preço avulso; combo só por registro explícito | 2026-10-13 | aceita |
| [0084](0084-excesso-no-ciclo-e-ordem-de-consumo.md) | Excesso no ciclo: mais próximas cobertas; consome primeiro o que vence antes | 2026-10-13 | aceita |
| [0085](0085-uma-assinatura-por-cliente-troca-sem-teto.md) | Uma assinatura por cliente; troca não disputa teto | 2026-10-13 | aceita |
| [0086](0086-regularizacao-de-mensalidade.md) | Regularização: cartão/Pix no provedor e baixa no balcão pelo admin | 2026-10-13 | aceita |
| [0087](0087-devolucao-de-uso-e-comissao-negativa.md) | Devolução só em ciclo vigente; comissão negativa com escolha do admin | 2026-10-13 | aceita |
| [0088](0088-interpretacoes-int-01-a-13-confirmadas.md) | Interpretações INT-01 a INT-13 confirmadas | 2026-10-13 | aceita |

## Em debate (perguntas abertas na conversa)

- Nada no momento.

## Pré-requisitos a verificar (fatos, não decisões)

- ~~CNPJ ativo da Barbearia do Moura?~~ → sim.
- ~~Woovi com Pix Automático na API?~~ → sim.
- ~~WhatsMiau hospedado ou self-hosted?~~ → hospedado (WhatsMiau Cloud).
- ~~Preço do WhatsMiau?~~ → Starter R$ 30/mês (1 instância), Pro R$ 90/mês (5 instâncias).
- ~~Validar com o contador o fluxo da Woovi~~ → dispensado; conta Woovi do dono do produto mantida (0030).
- **Nos provedores (Mercado Pago e Woovi)**, confirmar na API:
  - mudar a data de cobrança depois de pagamento atrasado (0052);
  - consultar o instante de aprovação e devolver cobrança duplicada (0052);
  - eventos de reversão e contestação (0054);
  - programar a troca de recorrência na virada do ciclo (0056);
  - migração de assinaturas entre contas (0057);
  - faixa de dias aceita para a data de cobrança (0080).

## Detalhes técnicos para o PRD (não são decisões de produto)

- ~~Calendário~~ → decidido na 0080.
- **Identidade:** procedimento da conferência assistida e proteção contra número reutilizado, inclusive no pré-cadastro (0070).
- **Concorrência:** reserva de horário, consumo de uso, reserva de vaga e confirmação de pagamento simultâneos. A exceção da 0061 vale só para a vaga de assinatura, nunca para dois atendimentos no mesmo horário.
- **Recálculo de reservas:** testar quando o ciclo muda (0052), quando a cobertura muda (0063) e quando a troca de recorrência falha (0056), sem cobrar em silêncio.
- **Retentativas e escalonamento** das integrações (0055, 0056).
- **Privacidade:** procedimento e prazos de exclusão de dados pessoais, arquivos e registros financeiros (0072). Não há validação jurídica.

## Riscos mantidos conscientemente

- WhatsApp obrigatório e sem canal de autenticação independente para quem não vinculou o Google (0017, 0070, 0031).
- Provedor de WhatsApp não oficial no piloto (0010, 0031).
- Sem simulação de margem dos planos (0022, 0023).
- Autonomia do barbeiro para bloquear horários livres, sem limite de horas (0032).
- Conta Woovi do dono do produto recebendo o Pix recorrente da barbearia (0030).
