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
