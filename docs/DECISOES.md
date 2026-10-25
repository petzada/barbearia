# Decisões do projeto — Barbearia do Moura

Registro das decisões humanas tomadas na unificação de `barbeariadomoura`
(Vite/React) e `mourabarber` (Next.js) em `petzada/barbearia`.

## Fundação

| Tema | Decisão |
|---|---|
| Base técnica | Next.js 16 (código e telas do mourabarber), atualizado para 16.4 (fora da faixa da CVE-2026-94545) |
| Hospedagem | Tudo na Cloudflare: Workers via OpenNext, banco **D1** (Drizzle), arquivos **R2**, **Cron Triggers** |
| Banco | Esquema novo e limpo (sem dados a migrar). Nada de Supabase |
| Login | Principal: código no WhatsApp (WhatsMiau). Secundário: Google. Sem e-mail/senha (Better Auth) |
| Pagamentos | AbacatePay: Pix com QR dinâmico (avulso) e assinatura recorrente (cartão / Pix Automático) via checkout |
| Pagamento avulso | Cliente escolhe: Pix agora ou pagar na barbearia |
| Planos do clube | Fixos — o dono define os benefícios exatos depois; estrutura pronta |
| Módulos portados | Conclusão + comissões, avaliações, financeiro + KPIs, painel WhatsApp + lembretes |
| Comissão | % por barbeiro sobre o preço de tabela, congelado na conclusão |
| Regras de agenda | Configuráveis pelo admin (grade, antecedência, janela, prazo de cancelamento) |
| Navegação | Abas por papel + troca de modo (cliente / barbeiro / gestão) |
| Repositório | `petzada/barbearia` (os outros dois ficam como referência) |

## Identidade visual

| Tema | Decisão |
|---|---|
| Tema | Light: fundo `#EAEAEA`, cards brancos com sombra suave, texto `#111` |
| Cor de destaque | Teal `#0E7C86` |
| Fonte | Manrope |
| Espaçamento | Arejado, grade de 4px, cantos de 16px, botões de 48px |
| Telas grandes | Responsivo completo (sidebar no desktop) |

## Telas (revisão uma a uma)

| # | Tela | Decisão |
|---|---|---|
| — | Navegação mobile | Barra **branca fixa** estilo iOS no rodapé, linha fina no topo, ativo em teal, botão central teal elevado |
| — | Cabeçalho | Título grande sobre o fundo (estilo iOS) em todas as telas, ações à direita |
| — | Estados | Skeleton ao carregar; vazio com ícone + frase + botão de próxima ação; erros em toast |
| 1 | Landing `/` | Hero com foto cheia (nome, slogan, "Agendar horário", "Já tenho conta"); serviços em cards; planos em carrossel; endereço/horário/WhatsApp; botão "Agendar" fixo após a 1ª dobra |
| 2 | Login | Foto no topo (~40%) + painel branco arredondado: WhatsApp com máscara, "Receber código no WhatsApp" (teal), "ou", "Continuar com Google" |
| 3 | Código OTP | 6 caixas separadas com autoenvio ao completar, colar/autopreenchimento, "Reenviar em 0:59", "Trocar número" |
| 4 | Onboarding | Um passo por tela com barra de progresso; botão fixo acima do teclado; termina em "Tudo pronto!" + "Agendar meu primeiro horário" |
| 5 | Termos / Privacidade | Textos do barbeariadomoura adaptados (WhatsApp, Google, AbacatePay, assinaturas, LGPD); índice no topo; data de atualização |
| 6 | 404 / erro | Humor de barbearia ("Essa página passou na navalha"), 404 grande, botão para o início |
| 7 | Início (cliente) | **Minimalista**: saudação + avatar, card do próximo horário (ou botão "Agendar") e banner do Clube. Sem carrossel nem lista de serviços |
| 8 | Agendar · barbeiro | Moldura simples (voltar, "Novo agendamento", progresso em 4 partes). Barbeiros em **grade de 2 colunas com foto quadrada grande**, nome e nota média. Sem opção "qualquer barbeiro" |
| 9 | Agendar · serviço | Lista de cards com ícone, nome, descrição, duração e preço; **1 serviço por agendamento** (combos são serviços próprios) |
| 10 | Agendar · data/hora | **Calendário mensal sempre aberto** (dias com horário livre em destaque) + grade de horários abaixo |
| 11 | Agendar · confirmação | **Folha inferior** (bottom sheet) sobre a tela de horários: resumo, Pix agora / pagar na barbearia, "Confirmar · R$ X" |
| 12 | Pix + sucesso | Botão "Copiar código Pix" em destaque com passo a passo; QR abaixo; contador de expiração; confirmação automática → sucesso com ✓, resumo e "Adicionar à agenda" |
| 13 | Meus agendamentos | Abas Próximos/Histórico em **lista compacta**; tocar abre folha inferior com detalhes e ações (pagar, cancelar, avaliar, agendar de novo) |
| 14 | Clube | Não assinante: planos empilhados com recomendado destacado. Assinante: "cartão de membro" escuro (plano, renovação, status), benefícios, pagamentos e cancelar discreto |
| 15 | Perfil | Foto/nome/WhatsApp no topo, seletor de modo (multi-papel), lista agrupada estilo Ajustes: Conta, Lembretes no WhatsApp (liga/desliga), Ajuda, Sair, Excluir conta (LGPD) |

> Histórico: as specs antigas do mourabarber (que descreviam Supabase) ficam no
> repositório `petzada/mourabarber`. Este repositório usa só Cloudflare (D1, R2,
> Workers, Cron Triggers).

### Barbeiro

| # | Tela | Decisão |
|---|---|---|
| 16 | Hoje | **Lista do dia direto**: números do dia no topo; lista cronológica de todos os horários do expediente (inclusive livres), com ação em cada linha |
| 17 | Agenda | Linha do tempo do dia (‹ › e calendário, linha do "agora", bloqueios tracejados) + **folha de ações** ao tocar (WhatsApp, Concluir/Faltou, pagamento no balcão, Cancelar). Botão **+** para **encaixe** ou bloqueio |
| 17b | Encaixe | Barbeiro busca o cliente pelo WhatsApp (vincula se tiver conta) ou informa **só o nome** (atendimento avulso: conta no financeiro e na comissão). Respeita a trava de sobreposição |
| 18 | Bloqueios | Lista dos **próximos bloqueios** agrupados por data (com remover) + "Novo bloqueio" em folha: atalhos Almoço/Manhã/Tarde/Dia inteiro/**Vários dias (férias)**, datas, horários, motivo; avisa conflitos com agendamentos |
| 19 | Ganhos | Filtro de período; **comissão total em destaque**; gráfico de barras por dia; extrato agrupado por dia; avaliações recentes |

### Gestão (admin)

| # | Tela | Decisão |
|---|---|---|
| 20 | Painel | **Operação de hoje** (ocupação, próximo atendimento por barbeiro, pendências: sem conclusão, Pix pendente) + **KPIs do período** (faturamento, ticket médio, atendimentos, assinantes ativos, faltas, nota média), gráfico de faturamento por dia, ranking de serviços e barbeiros |
| 21 | Financeiro | Filtro de período + abas **Resumo · Recebimentos · Comissões**; exportar CSV. Resumo: serviços, recebido online, recebido no balcão, assinaturas, (−) comissões, resultado estimado |
| 21b | Repasse de comissões | Admin **fecha o período por barbeiro e marca como pago** (data e forma); barbeiro vê em Ganhos o recebido e o a receber |
| 22 | Agenda geral | Mesmo topo da agenda do barbeiro; **uma coluna por barbeiro** lado a lado (rolagem horizontal no celular), chips para filtrar, mesma folha de ações, "+" para encaixe/bloqueio em qualquer barbeiro |
| 23 | Clube (gestão) | Resumo (ativos, receita recorrente mensal, vencendo em 7 dias), busca por nome/WhatsApp, filtros Ativos/Vencendo/Cancelados, folha com histórico, renovar manual e cancelar; "+ Registrar pagamento no balcão" |
| 24 | Hub Gestão | Lista agrupada estilo Ajustes: Catálogo (Serviços, Planos), Equipe e agenda (Equipe, Horários e regras), Relacionamento (Avaliações com nota, WhatsApp com status), Conta (Meu perfil) |
| 25 | Serviços | Lista com duração, preço e chave Ativo na linha; **arrastar para ordenar**; edição em folha (duração em chips 15/30/45/60/90 + personalizado, preço com máscara) |
| 26 | Equipe | Cards por pessoa (foto, papéis, %, "Recebendo agendamentos"); folha de edição (foto, papéis, comissão 0–100%, agendamentos on/off); "+ Adicionar" busca pelo WhatsApp ou convida pelo WhatsApp |
| 27 | Horários e regras | Seções: Funcionamento (7 dias com chave e horário, "copiar para dias úteis"), **Feriados e fechamentos especiais**, Regras de agendamento (seletores), Barbearia (nome, WhatsApp, endereço, Instagram) |
| 27b | Escala | **Escala semanal por barbeiro** (dias/horários próprios dentro do funcionamento), editada na Equipe; a disponibilidade usa a interseção barbearia ∩ barbeiro |
| 28 | Planos | Prévia do card como o cliente vê (chips Ativo/Recomendado, nº de assinantes); edição em folha (nome, descrição, preço, ciclo, benefícios reordenáveis, recomendado, ativo); aviso de que preço/ciclo novos valem só para novas assinaturas |
| 29 | Avaliações | Nota média + total, distribuição 5★–1★, chips de média por barbeiro (filtram), filtro "só notas baixas (≤3)", lista com "Responder no WhatsApp" |
| 30 | WhatsApp | Card de status no topo com a ação do momento (QR que atualiza sozinho, Sincronizar, Desconectar) e aviso de que sem conexão o login por código para; seções Lembretes (liga/desliga, horário do envio, editor com variáveis clicáveis e prévia em balão), Teste, Histórico (filtro OTP/Lembrete/Teste) |
