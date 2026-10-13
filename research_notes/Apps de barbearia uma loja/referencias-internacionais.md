# Referências internacionais — software de barbearia para uma loja

Consulta em 13 de outubro de 2026. Escopo: padrões de produto para um web app mobile-first de **uma** barbearia (cliente + mensalidade), não SaaS multi-loja nem marketplace. Preço Brasil fica de fora. Números são os publicados nas páginas citadas (em geral EUA/USD); outra geolocalização pode mudar a tabela. Nenhum dos sete produtos estava encerrado nesta data. Shedul é o nome antigo da Fresha (o slug da Capterra ainda é `Shedul-com`).

Boulevard foi o OS premium escolhido: a central de ajuda descreve criação de plano, resgate e cobrança falha. Mangomint não foi aprofundado.

## Booksy

### Takeaway
Booksy vende para o dono da barbearia um sistema único (agenda, marketplace, pagamentos e mensalidades) cobrado por pessoa da equipe, e para o cliente um app grátis da própria Booksy. A listagem no marketplace não cobra comissão; a comissão de 30% só existe se o dono ligar o Boost. Depósito e taxa de cancelamento são políticas diferentes, e a lista de espera avisa por SMS sem reservar o horário sozinha.

### Cited Findings
- Posicionamento: página de preço dos EUA inclui listagem no marketplace, reservas ilimitadas e app do cliente grátis, sem taxa de reserva para o cliente. O comprador do software é o negócio; o cliente usa “Booksy for Customers”. — [Preço Booksy EUA](https://biz.booksy.com/pricing); [App do cliente](https://biz.booksy.com/features/customer-app)
- Cobrança da loja (EUA, página consultada em 13 out 2026): US$ 29,99/mês + imposto pelo primeiro usuário e US$ 20/mês por membro extra da equipe. Teste de 14 dias sem cartão. Sem contrato. SMS de marketing: 2.000 grátis/mês; confirmações e lembretes sempre grátis. — [Preço Booksy EUA](https://biz.booksy.com/pricing)
- A página do Reino Unido, na busca desta pesquisa, lista £40/mês + VAT e £5 por usuário extra, com teste de 7 dias. Não tratar US$ 29,99 como preço global. — [Preço Booksy Reino Unido](https://biz.booksy.com/en-gb/pricing)
- Pagamentos (EUA): Mobile Payments e digitado 2,69% + US$ 0,30; leitora 2,49% + US$ 0,10; Tap to Pay 2,49% + US$ 0,20. Repasse no dia útil seguinte grátis; repasse em 30 minutos custa 1,5%. Leitoras Stripe M2 US$ 53,10 e S710 US$ 299, mais frete. — [Preço Booksy EUA](https://biz.booksy.com/pricing)
- Boost: sem mensalidade; comissão única de 30% do valor da primeira visita de um cliente que entrou com o Boost ligado, teto de US$ 100. Sem Boost, a Booksy diz que não cobra comissão de cliente novo, inclusive os que acham o negócio no marketplace. O link do perfil evita a comissão mesmo com Boost ligado. — [Preço Booksy EUA](https://biz.booksy.com/pricing)
- A assinatura inclui waitlist, proteção contra falta, gift cards, memberships e packages. Gift cards e no-show usam a taxa de Mobile Payments. — [Preço Booksy EUA](https://biz.booksy.com/pricing)
- Depósito: o cliente que reserva online paga parte ou o total; o valor abate no checkout; mínimo US$ 5; regras por grupo de serviços (percentual ou valor fixo). Exige Mobile Payments. Se cancelar ou faltar, a loja fica com o que já foi pago. — [Depósitos](https://support.booksy.com/hc/en-us/articles/16487324704658-How-can-I-accept-deposits-for-appointments-booked-by-my-clients); [Depósito vs taxa](https://support.booksy.com/hc/en-gb/articles/16487431553810-What-is-the-difference-between-Deposits-and-Cancellation-Fees)
- Taxa de cancelamento: o cliente vê a política, grava um cartão, a reserva só confirma depois da verificação. A loja pode cobrar ou perdoar falta/cancelamento tardio, ou automatizar em No-Show Protection. — [Depósito vs taxa](https://support.booksy.com/hc/en-gb/articles/16487431553810-What-is-the-difference-between-Deposits-and-Cancellation-Fees)
- Cada serviço pode exigir depósito ou taxa, mensagem e perguntas no fluxo, e pode ser fechado para autoagendamento. Serviço “mobile” (na casa do cliente) exige confirmação manual. — [Ajustes de serviço](https://support.booksy.com/hc/en-us/articles/21028092250258-How-do-I-customize-my-service-settings)
- A loja publica políticas (atraso, walk-in, depósito, prazo para remarcar). O cliente remarca no app dentro da regra. — [Políticas](https://support.booksy.com/hc/en-us/articles/33391748628626-How-to-set-up-my-policies)
- Lista de espera: o cliente entra por um dia ou intervalo. Se abre vaga, a Booksy manda SMS com link. Não segura o horário nem marca sozinha; é quem chegar primeiro. A loja vê a fila no calendário. — [Waitlist](https://support.booksy.com/hc/en-us/articles/16463469277714-How-does-the-waitlist-work)
- Recorrência é criada pelo profissional (diária, semanal, mensal, ou dias diferentes), com escolha de funcionário e, se precisar, equipamento. O cliente não cria a série; no app cada ocorrência é um horário separado, que ele altera ou cancela um a um. — [Recorrência](https://biz.booksy.com/en-us/blog/creating-a-recurring-booking-is-easy-with-booksy)
- Superfície do cliente: app para ver, remarcar, pagar e “Book Again”, e também o link no navegador, sem baixar o app. Integrações citadas na página de reserva: Google, Instagram e Facebook. — [App do cliente](https://biz.booksy.com/features/customer-app); [Reserva online](https://biz.booksy.com/features/online-booking)
- Memberships, segundo post de blog sem data visível na extração: a loja cria um modelo (nome, descrição, validade, preço) em Business Profile > Memberships e vende em Sales > Memberships. O cliente recebe SMS e e-mail. O texto não descreve sessões, ilimitado nem falha de pagamento. — [Blog de memberships](https://biz.booksy.com/en-us/blog/kick-start-your-business-with-memberships)
- Objeções (relatos, não auditoria): no Reddit r/hairstylist, profissionais descrevem taxa de falta que não captura, chargeback e taxa de US$ 20 para disputa, e a regra de que a taxa só vale em reserva feita pelo cliente, não pela loja. — [Thread 1](https://www.reddit.com/r/hairstylist/comments/1o0kvz2/booksy_is_literally_the_worst_app_for_service/); [Thread 2](https://www.reddit.com/r/hairstylist/comments/1wh89n6/if_youre_considering_using_booksys_scheduling/)
- Capterra (páginas intituladas 2026): reclamações de cartão inválido aceito no arquivo, comissão do Boost, suporte lento e link de indicação que empurra download do app. O resumo de contras da ficha cita pagamento lento/confuso e atendimento ruim. Uma review datada de 15 dez 2025 chama o painel de confuso e instável, e elogia o lado do cliente. — [Reviews](https://www.capterra.com/p/142741/Booksy/reviews/); [Ficha](https://www.capterra.com/p/142741/Booksy/)

### Inferences
- Vale copiar: link de reserva sem app; depósito **ou** cartão salvo, não os dois obrigatórios; mínimo de depósito; regra por serviço; cliente remarca dentro da janela; waitlist que só avisa; recorrência criada pela loja; “marcar de novo” com o mesmo serviço e profissional.
- Existe por ser marketplace: app Booksy do cliente, Boost e a briga de atribuição (link próprio vs descoberta). Uma loja só não precisa de vitrine de concorrentes.

### Gaps
- Não achei artigo de ajuda de 2026 que explique resgate de membership (cortes ilimitados vs créditos) nem o que acontece se a mensalidade do cliente falha. O blog não tem data.
- Não há, nestas fontes, o modelo de colunas da agenda nem folga do barbeiro em detalhe. “Equipamento” aparece só na recorrência.
- Não pesquisei G2 nem r/barber com resultado útil.

## Fresha

### Takeaway
A Fresha cobra assinatura por profissional que aparece na agenda e, à parte, 20% uma vez só quando o cliente novo vem do marketplace. Pacotes e memberships (sessões limitadas ou ilimitadas, à vista ou recorrentes) entram no plano. WhatsApp é canal pago depois da franquia, o que importa para um app brasileiro mesmo sem copiar o preço dos EUA.

### Cited Findings
- A página de preço em USD (13 out 2026) oferece Independent a US$ 19,95/mês para 1 profissional, e Team a US$ 14,95/mês por “bookable team member”, com equipe ilimitada. Sem contrato. Pagamentos pela Fresha são opcionais. Trial de 7 dias sem cartão é descrito para negócios com equipe. — [Preço Fresha](https://www.fresha.com/pricing)
- Marketplace: comissão única de 20% sobre cliente novo que descobre o negócio no marketplace, mínimo de US$ 6. Cliente que volta não paga comissão. Link direto, Facebook e Instagram: sem essa taxa. A Fresha diz que não cobra taxa por cada horário. — [Preço Fresha](https://www.fresha.com/pricing)
- Cartões (USD): online 2,79% + US$ 0,20; presencial 2,29% + US$ 0,20, mais US$ 0,10 por autorização Tap to Pay; Klarna 5,99% + US$ 0,30; digitado 3,30% + US$ 0,20. Terminal a partir de US$ 139. — [Preço Fresha](https://www.fresha.com/pricing)
- Mensagens: e-mail automático grátis. SMS/WhatsApp: 100 grátis/mês no Independent, ou 100 por membro no Team; depois US$ 0,02 por SMS ou US$ 0,04–0,11 por WhatsApp. E-mail de marketing: 50 grátis (por membro no Team) e depois US$ 0,02. SMS de marketing: US$ 0,08. — [Preço Fresha](https://www.fresha.com/pricing)
- Os dois planos listam calendário, waitlist, POS, fichas, formulários, avaliações, estoque, gift cards, packages, memberships, app do negócio, grupo, tempos de processamento/finalização e resources. O FAQ diz que o Team acrescenta calendário multiusuário, comissão e ponto. — [Preço Fresha](https://www.fresha.com/pricing)
- A página lista “Client booking app” e “Direct booking links”. Não ficou explícito se o cliente reserva como convidado, sem conta. — [Preço Fresha](https://www.fresha.com/pricing)
- Política de pagamento: depósito em percentual ou valor fixo, com prazo em que o cancelamento devolve o depósito; taxa de falta; dá para exigir regras diferentes por grupo de clientes. Depósito e cobrança no cartão salvo pagam a taxa normal do meio usado. “Capture card details” cobra uma taxa fixa por horário confirmado com cartão, mesmo se o horário não acontecer; se o checkout for pela Fresha, entra também a taxa percentual. A comissão de cliente novo do marketplace incide sobre o valor cheio do horário, com ou sem depósito. — [Políticas de pagamento](https://www.fresha.com/help-center/knowledge-base/payments/101660-set-up-payment-policies)
- Membership: pagamento único (vale por um prazo) ou recorrente (frequência, preço e duração). Em “Sessions”, a loja escolhe quantidade limitada ou ilimitada. Há toggle de venda online. — [Criar memberships](https://www.fresha.com/help-center/knowledge-base/gift-cards/71-create-memberships)
- Cancelar membership para cobranças futuras e o cliente deixa de resgatar o saldo. Não reativa; vende-se outra. Dá para pausar e retomar. Sessões restantes e histórico ficam no perfil, em Items > Memberships. — [Memberships ativas](https://www.fresha.com/help-center/knowledge-base/memberships-packages-and-gift-cards/101269-manage-active-memberships)
- Pacote: na venda, se o serviço do checkout está no pacote, a primeira sessão entra sozinha e o preço vai a US$ 0. Reservas futuras do serviço coberto também abatem sessão. Exemplo da ajuda: 4 sessões para 3 serviços = qualquer um dos três, até quatro vezes. — [Vender pacote](https://www.fresha.com/help-center/knowledge-base/packages-memberships-and-gift-cards/102553-sell-a-package-at-checkout)
- A Fresha se descreve como a maior plataforma de beleza e bem-estar e cita “over 120,000 businesses” e marketplace global. Isso é fala comercial da própria página. — [Preço Fresha](https://www.fresha.com/pricing)
- Capterra (ficha 2026) lista como contras pagamento complicado/instável, taxas opacas e em alta, e políticas de cancelamento restritivas. Uma review descreve comissão de marketplace (no relato, US$ 15) mantida quando a loja cancelou o horário a pedido do cliente, porque a política exigiria o cliente cancelar online. — [Ficha Capterra](https://www.capterra.com/p/142138/Shedul-com/)
- Texto de concorrente (não é a Fresha) agrega queixas de atribuição da comissão e de o marketplace mostrar outros negócios quando a agenda está cheia. Tratar como secundário. — [Expressbook](https://expressbook.com/fresha-reviews/)

### Inferences
- Vale copiar: duração e preço do serviço por profissional; recurso (cadeira); tempo de processamento separado da cadeira; depósito com regra de reembolso; pacote que abate sozinho no checkout; membership ilimitada **ou** com N sessões por ciclo; pausar sem apagar o histórico.
- O corte de benefícios no cancelamento é uma escolha de produto, diferente da Boulevard (abaixo), que pode deixar voucher não usado.
- Existe por ser marketplace: comissão de 20% com mínimo, briga sobre quem “trouxe” o cliente, e app/marketplace Fresha. O link direto já é o produto de uma loja só.

### Gaps
- A página de criar membership devolveu pouco HTML útil; o detalhe de sessões ilimitadas veio do trecho indexado dessa URL, não de uma leitura limpa do corpo.
- Não achei o comportamento documentado de cartão recusado na mensalidade do cliente.
- Não confirmei checkout de convidado versus conta obrigatória.

## Squire

### Takeaway
A Squire é software de barbearia, vendido ao dono (ou ao barbeiro solo), com preço por loja e não por cadeira na tabela pública. O discurso oficial é o contrário de um marketplace: o cliente da loja não é oferecido a outros negócios. Mensalidade de cliente e programa de fidelidade não aparecem nos planos de uma loja; fidelidade, gift card e app de marca estão no plano multi-loja.

### Cited Findings
- Planos na página oficial consultada em 13 out 2026: Independent US$ 30/mês (barbeiro solo); Pro US$ 50/mês (uma loja); Executive US$ 150/mês por loja; Titan US$ 250/mês por loja. — [Preço Squire](https://www.getsquire.com/pricing)
- Independent inclui reserva online, proteção contra falta, agenda, lembretes ilimitados de e-mail/SMS, Engage com IA, “Flex branded app” e relatórios. Pro acrescenta várias contas de barbeiro, reserva via Google e Instagram, gestão da loja, waitlist, onboarding, transferência de clientes, promoções. Executive acrescenta e-mail/SMS de marketing ilimitados, Google Reviews Booster, comissão e aluguel de cadeira; landing de marca é add-on de US$ 25/mês e “Operator” de IA é add-on de US$ 99/mês. Titan acrescenta multi-loja, branded app, fidelidade, gift cards, estoque e chat com cliente. — [Preço Squire](https://www.getsquire.com/pricing)
- A página diz que lembretes de e-mail e SMS são grátis e ilimitados, que há proteção contra atraso e falta, horário em grupo (pai e filho ou festa) e Tap to Pay no iPhone e Android sem hardware. Também afirma: “Your clients won't be sold or shown to other businesses”. — [Preço Squire](https://www.getsquire.com/pricing)
- A página de pagamentos diz que o cliente pode pré-pagar na reserva online e o depósito abate no ticket; walk-in paga no POS; processamento em infraestrutura Stripe, com cartão salvo em token, não o número no aparelho. Não publica a taxa nessa página. — [Pagamentos](https://getsquire.com/features/payments)
- Outro texto oficial da Squire: processamento com cartão presente a 2,5% + US$ 0,20; planos a partir de US$ 30/mês; repasse automático de comissão e cobrança de aluguel de cadeira. — [POS e custo](https://getsquire.com/business-edge/point-of-sale-benefits-for-your-shop)
- Termos do cliente: a taxa de cancelamento do profissional ou da loja, se houver, aparece para aceite antes de confirmar. A Squire também pode cobrar “Disruption Fee” se suspeitar de reservas repetidas e abusivas. Informar o cartão autoriza cobrança de serviço, cancelamento ou disruption fee. A Squire diz que facilita o pagamento e não é banco. — [Termos](https://getsquire.com/legal/terms)
- Diretórios ainda mostram preços velhos (Pro a US$ 100 na SoftwareAdvice e na GetApp, esta “last updated: March 2026”). A página oficial atual lista Pro a US$ 50. Prevalece a página oficial. — [SoftwareAdvice](https://www.softwareadvice.com/barbershop/squire-profile/); [GetApp](https://www.getapp.com/retail-consumer-services-software/a/squire/); [Preço Squire](https://www.getsquire.com/pricing)
- Reviews na SoftwareAdvice (página 2026, sem data de cada review na extração): cartão exigido para reservar; taxa extra de “booking fee” quando o cliente pré-paga, com dúvida se isso cobre a taxa do cartão ou é cobrança dupla; pré-autorização só cerca de 1 hora antes, não na janela de 24 horas da política; clientes de marketplace pagando com Apple Pay / gift card sem fundo. São relatos de usuários. — [SoftwareAdvice](https://www.softwareadvice.com/barbershop/squire-profile/)
- A mesma ficha lista, como capacidade do produto, reservas recorrentes e POS. Não achei isso repetido na página de preço oficial. — [SoftwareAdvice](https://www.softwareadvice.com/barbershop/squire-profile/)

### Inferences
- Vale copiar: agenda da loja com várias contas de barbeiro num plano fechado (não por seat); lembrete SMS incluso; pré-pagamento que vira abatimento; horário de grupo; a promessa de não revender a base. “Flex branded app” no plano solo sugere app com a cara da barbearia, não um marketplace.
- Existe por ser plataforma de várias lojas ou de aluguel de cadeira: comissão e rent collection no Executive, branded app / fidelidade / estoque no Titan. Uma loja com funcionários CLT ou sócios não precisa de split de aluguel no primeiro corte do produto.
- A “Disruption Fee” é lógica de marketplace (abuso de quem reserva em muitos barbeiros). Numa loja só, a política da casa basta.

### Gaps
- O FAQ “Does SQUIRE charge extra for each barber I add?” está na página, mas a resposta não veio na extração. O preço publicado é por loja ou por barbeiro solo; não dá para afirmar “zero por cadeira” como frase oficial.
- Não achei membership de cliente (corte ilimitado ou créditos) na página de preço. Fidelidade só aparece no Titan.
- Não achei taxa de cartão não presente, prazo de repasse nem documentação de falta de pagamento de uma mensalidade de cliente.
- Não achei review recente em G2, Capterra ou r/barber nestas buscas.

## theCut

### Takeaway
A theCut é um app de barbearia (barbeiro, dono e cliente), com plano grátis de verdade e um marketplace em que a descoberta pode custar US$ 10 por cliente novo. O cliente paga US$ 0,95 por transação no app, além dos 2,75% que saem do barbeiro. Para uma loja só, o miolo útil é link de reserva, política de falta, pré-autorização e recorrência — não a busca de barbeiros da cidade.

### Cited Findings
- Página de preço consultada em 13 out 2026: FREE US$ 0/mês para o barbeiro; PRO US$ 25/mês; Shop US$ 0 para o dono. Trial de PRO por 30 dias. “Owners use theCut for free. Barbers can too.” Apps iOS e Android. O cliente cria perfil com nome, foto e telefone. — [Preço theCut](https://thecut.co/pricing)
- A mesma página lista, sem a extração conseguir marcar a coluna de cada item: reserva, blasts, pagamentos a 2,75%, Client Discovery a “US$ 10 per client” no FREE e “Included” no PRO, calendário, push/e-mail e SMS, bloquear horário, remarcar, recorrência, gorjeta, self-checkout, deposit schedules, Tap to Pay, leitora, link pessoal, políticas de cancelamento e falta (geral ou por cliente), lealdade, indicação, aluguel de cadeira e agenda central da equipe. — [Preço theCut](https://thecut.co/pricing)
- Um comparativo que diz ter lido thecut.co em 20 set 2026 (página atualizada em out 2026) atribui ao PRO: blasts, SMS, recorrência, descoberta de clientes inclusa e gestão avançada de clientes. Ao FREE: reserva, link, atualizações, pagamentos e políticas de falta. Ao Shop grátis: perfil da loja, equipe, várias unidades, agenda central e aluguel de cadeira. — [iTechGuides](https://www.itechguides.com/products/thecut/pricing/)
- Pagamentos, página oficial: 2,75% descontados do valor antes do depósito na conta do barbeiro; o cliente paga mais US$ 0,95 por transação. Toda reserva via Mobile Pay gera pré-autorização (hold, não cobrança), que expira ou é anulada se o horário é recusado, cancelado ou pago em dinheiro na loja. Repasse padrão em 1–2 dias úteis. — [Pagamentos](https://thecut.co/payments)
- Ajuda datada de 1 jul 2026: mesma taxa de 2,75% e US$ 0,95 para o cliente; repasse instantâneo em 30–60 minutos por 1,5%; PRO pode sair de graça se o barbeiro processa Mobile Pay (o texto não diz o volume); depósito padrão grátis em 1–2 dias úteis. O título manda fazer upgrade para PRO “to become bookable”, o que destoa da página de preço, em que o FREE inclui Client Booking e link. — [Ajuda PRO](https://help.thecut.co/en/articles/9156628-unlocking-thecut-pro-subscriptions-fees-deposits-explained)
- Outro artigo de ajuda: no FREE, busca (“Search”) cobra US$ 10 do cliente que descobre o barbeiro por ali; conta rebaixada para LITE deixa de ser reservável e some da busca. Há tensão entre “link grátis reservável” e “só PRO é bookable”. — [FAQ](https://help.thecut.co/en/articles/8525211-our-frequently-asked-questions)
- App Store (página consultada nesta pesquisa): review de barbeiro diz que o recurso de growth cobra US$ 10 por cliente novo mesmo se ele não comparece, que o suporte é um chatbot, e que o link manda o cliente atual para a App Store em vez de reservar sem instalar outro app. — [App Store](https://apps.apple.com/us/app/thecut-find-book-barbers/id1101408626)
- Agregador de reviews Android cita, em 29 dez 2025, atraso e divisão de depósitos. É segunda mão. — [AppRecs](https://apprecs.com/android/com.thecut.mobile.android.thecut/thecut%3A-barbershop-booking)

### Inferences
- Vale copiar: política de falta geral com exceção por cliente; pré-autorização na reserva em vez de cobrar a taxa só depois (os relatos da Booksy reclamam exatamente da cobrança que falha); self-checkout e gorjeta no celular; recorrência no plano do barbeiro.
- Não copiar: taxa de US$ 0,95 cobrada do cliente por usar o app; US$ 10 por lead da busca, pago mesmo com no-show; obrigar download. Isso é modelo de marketplace e de processamento, não de barbearia única.
- O plano Shop a US$ 0 mostra que o dono pode ser um papel de visão da equipe, separado da assinatura de cada barbeiro. Numa loja só, um login de dono e logins de barbeiro resolvem sem esse marketplace.

### Gaps
- A tabela oficial não renderizou quais linhas são FREE, PRO ou Shop. Onde a coluna importa, usei o iTechGuides (20 set 2026) e marquei como secundário.
- Não achei membership de cortes. “Loyalty” e “Referral” estão na lista de recursos, sem regra de resgate.
- Não achei o limiar exato de transações que zera o PRO; a ajuda só diz que processar Mobile Pay pode dar PRO grátis.

## GlossGenius

### Takeaway
A GlossGenius vende para o profissional de beleza um site de reserva sem login e sem app, com mensalidades e pacotes já no plano de entrada, e empurra waitlist e cadeira/sala para o plano do meio. Não há marketplace. A objeção recorrente é instabilidade e saque retido, não a lógica de reserva.

### Cited Findings
- Preço na página oficial (13 out 2026), beleza e bem-estar: Standard US$ 28/mês ou US$ 24/mês no anual; Gold US$ 56 ou US$ 48; Platinum US$ 168 ou US$ 148. Gold é descrito para equipes de até 9 pessoas; Platinum para equipes de 10+ e “unlimited team members”. Trial de 14 dias sem cartão. Não há plano grátis. Local extra paga o plano com 15% de desconto. — [Preço GlossGenius](https://glossgenius.com/pricing)
- O FAQ coloca no Standard agenda, site de reserva, POS e marketing básico, e lista “Packages & Memberships (NEW)” nos destaques do Standard. No Gold: Google Reviews, text marketing, waitlist, time tracking e Room & Resource Management. No Platinum: membros ilimitados, analytics de marketing e 2.500 textos de marketing. Textos de marketing no comparativo: 500 créditos no Gold e 2.500 no Platinum, na leitura da grade. — [Preço GlossGenius](https://glossgenius.com/pricing)
- A mesma página anuncia reserva 24/7 “login-free” e “no app downloads required”, taxa única de 2,6% sem adicional de Tap to Pay, cartão salvo ou digitação, depósitos embutidos, políticas de cancelamento e de cartão salvo, vários profissionais no mesmo horário, add-ons de serviço, tempo de intervalo (“gap time”) e tempo de processamento, aprovação manual, horários sobrepostos, e rebooking automático no checkout. Repasse no mesmo dia útil, de segunda a quinta, grátis; instantâneo a mais 1,8%. — [Preço GlossGenius](https://glossgenius.com/pricing)
- Exemplo público de vitrine de uma salão (não é a regra única do produto): membership de US$ 79/mês, “Renews monthly / Cancel anytime”, com uma unidade de cada serviço listado (corte, cor, etc.). Mostra como o cliente vê o pacote, não prova que todo plano seja “1 de cada”. — [Exemplo de membership](https://creativeimpression.glossgenius.com/shop/memberships/10039-7b830b55-7955-4066-b561-a544c5b54066)
- Capterra, página 2 de reviews intitulada 2026: uma usuária criou memberships no lançamento e ainda via bugs; outra diz que não dá para reordenar memberships no site como se reordena serviços. Outras queixas na mesma página: preço alto para quem está só, trial que virou um plano mais caro que os US$ 24 básicos, app inutilizável depois de atualização no sábado, suporte por IA sem telefone. Há também elogio de reserva simples para o cliente. — [Capterra p.2](https://www.capterra.com/p/174830/GlossGenius/reviews/?page=2)
- Reddit r/hairstylist: uma profissional descreve o app fora do ar no meio do dia, “cerca de uma vez por mês”, e o corte de recursos que saíram do Standard e foram para o Gold. Outro fio, sem data na extração, descreve saque retido por 21 dias e nova verificação de conta. São relatos. — [Instabilidade](https://www.reddit.com/r/hairstylist/comments/1l0h6nu/glossgenius_vs_square_vs_booksy/); [Saque](https://www.reddit.com/r/hairstylist/comments/1t491vm/glossgenius_has_held_my_money_for_3_weeks_still/)

### Inferences
- O padrão mais direto para um web app de uma loja: escolher serviço, profissional e horário sem criar conta; pagar depósito no mesmo fluxo; guardar cartão só se a política de falta exigir. Conta pode existir para remarcar e para a mensalidade, não como portão da primeira reserva.
- Membership no plano barato, não como add-on, combina com o objetivo. O exemplo de vitrine é um pacote mensal de itens nomeados, com cancelar quando quiser — fácil de explicar no celular.
- Waitlist e recurso (cadeira/sala) estão atrás de um plano maior. Para uma loja, os dois cabem no produto único; não precisam ser upsell.
- Não há comissão de marketplace para ignorar. O que não copiar é a suíte de medspa, payroll e “várias unidades”.

### Gaps
- Não achei ajuda oficial de resgate (voucher vs ilimitado) nem o que a GlossGenius faz se a mensalidade do cliente recusa o cartão.
- A grade de recursos veio com marcadores vazios na extração; o que está em qual plano apoia-se no FAQ e nos destaques, não numa célula verificada uma a uma.
- Não achei G2 nem review de App Store nesta rodada.

## Square Appointments

### Takeaway
A Square é o caso “software grátis, dinheiro no cartão”: US$ 0 por local no Free, e o pago existe para taxa de falta, waitlist e, no topo, cadeira/sala. Pacote pré-pago de serviços está documentado; mensalidade recorrente de serviços ainda aparece como pedido antigo da comunidade, preenchido por apps parceiros.

### Cited Findings
- A página oficial de Appointments nos EUA mostra três mensalidades por local: US$ 0, US$ 49 e US$ 149 (Free, Plus e Premium). Plus e Premium têm trial de 30 dias. Free não tem mensalidade; cobra só o processamento. Acima de US$ 250 mil/ano há preço sob consulta. — [Preço Appointments](https://squareup.com/us/en/appointments/pricing)
- A extração dessa página mostrou, para cartão presente, 2,6% + US$ 0,15 e, para online, 3,3% + US$ 0,30, mas o texto colapsado não deixa a coluna (Free vs Plus vs Premium) inequívoca. Um resumo que diz ter checado a página em outubro de 2026 atribui essas duas taxas ao Free, 2,5% + US$ 0,15 e 2,9% + US$ 0,30 ao Plus, e 2,4% + US$ 0,15 e 2,9% + US$ 0,30 ao Premium. — [Preço Appointments](https://squareup.com/us/en/appointments/pricing); [Resumo de out/2026](https://merchantservicesinsider.com/square-appointments-fees/)
- A ajuda oficial de taxas lista Square Plus: presencial 2,5% + US$ 0,15; online ou fatura 2,9% + US$ 0,30; digitado ou cartão salvo 3,5% + US$ 0,15. Square Premium: presencial 2,4% + US$ 0,15; online 2,9% + US$ 0,30; digitado ou cartão salvo 3,5% + US$ 0,15. Cartão internacional: +1,5%. Planos antigos de “Square Appointments” ainda existem como legacy. — [Taxas Square](https://api.squareup.com/help/us/en/article/5068-what-are-square-s-fees)
- Recursos descritos na página de Appointments: calendários de equipe sem limite de funcionários; site de reserva, botão, QR e widget; depósito parcial; pré-pagamento; Apple Pay e Google Pay no fluxo; tempo de processamento para encaixar outro cliente na espera química; vários profissionais no mesmo horário; política de cancelamento com cartão na reserva e cobrança de falta; teto diário de reservas online; pacotes e aulas pré-pagos, com o valor aplicado sozinho no checkout; waitlist com aviso quando abre vaga; recursos (sala, cadeira, estação); lembrete por SMS em que o cliente confirma, cancela ou muda, e a agenda atualiza (Square Assistant). — [Preço Appointments](https://squareup.com/us/en/appointments/pricing)
- A página agrupa, em blocos que parecem ser os planos, “Cancellation policy and no-show fees”, “Multi-staff appointment booking” e “Waitlist” separados de “Resource management”. O resumo de outubro de 2026 afirma que taxa de falta, multi-staff e waitlist estão no Plus, e recursos no Premium. A página oficial, na extração, não rotula essa frase. — [Preço Appointments](https://squareup.com/us/en/appointments/pricing); [Resumo de out/2026](https://merchantservicesinsider.com/square-appointments-fees/)
- Fio da comunidade Square, com respostas de parceiros em 6 jan 2026 e 24 mar 2026: o autor diz que categorias, formulários e depósito já existem, e que membership mensal com código e desconto automático de serviços ainda não. Subport, Pintuna e Submatic se oferecem como app parceiro para isso. Não é documentação de produto da Square. — [Pedido de membership](https://community.squareup.com/t5/Feature-Requests/Monthly-Memberships-for-Services/idi-p/830090)
- Capterra (ficha 2026): elogio de simplicidade e queixa de pouca customização visual, recursos avançados limitados quando há vários funcionários, e falha ocasional de sincronia ou notificação. Uma review diz que faltavam indicação e formulários. — [Ficha Capterra](https://www.capterra.com/p/170263/Square-Appointments/)

### Inferences
- Vale copiar: site e widget no site da barbearia; carteira digital no celular; depósito parcial; cartão na reserva só para a política de falta; pacote pré-pago que zera o serviço no caixa; SMS em que a resposta altera a agenda; cadeira como recurso, não como segundo calendário humano; tempo de processamento se algum serviço libera a cadeira no meio.
- Não depende de marketplace. O que é grande demais para a v1 de uma loja: multi-local, hardware, folha, e o ecossistema de apps para suprir membership.
- Se a mensalidade de cliente é requisito, a Square é o contraexemplo: o agendamento maduro ainda empurra isso para fora. Boulevard e Fresha são as referências de desenho.

### Gaps
- Não confirmei, na página oficial lida por completo, qual plano liga cada recurso. A atribuição Plus/Premium fica no resumo de terceiros de outubro de 2026.
- Não achei checkout convidado versus conta Square do cliente.
- Não achei membership nativa recorrente; o fio da comunidade pode estar desatualizado em relação a um lançamento não achado aqui.

## Boulevard

### Takeaway
A Boulevard é o manual público mais claro de mensalidade de salão: o plano cobra no cartão salvo, e o benefício é voucher de serviço, desconto de membro ou crédito em carteira — três mecânicas, não um “ilimitado” genérico. A agenda empurra o cliente para as pontas do dia para não deixar buraco impreenchível. O preço de uma loja pequena já passa de US$ 150/mês. Quase tudo isso serve a uma barbearia só; multi-loja e membership compartilhada entre unidades, não.

### Cited Findings
- Preço Salon & Spa na página oficial (promoção de outono, clientes novos, consulta em 13 out 2026): Essentials US$ 159/mês ou US$ 143/mês no anual, para 1 local e até 5 profissionais; Premier US$ 260/mês por local ou US$ 234 no anual (preço “normal” citado na página: US$ 325 / US$ 293), profissionais ilimitados e multi-loja; Prestige US$ 364 ou US$ 328 (normal US$ 455 / US$ 410). Forms a partir de US$ 65/mês por local. Campanha automática: US$ 2 por horário concluído marcado em até 7 dias do envio. E-mail além da franquia: US$ 0,01. — [Preço Boulevard](https://www.joinblvd.com/pricing)
- Em todos os planos de salão: reserva online, Precision Scheduling, lembretes, waitlist, processamento e finalização, vários profissionais, walk-in, depósito, grupo, resource scheduling, saldo em conta, memberships com autopay, séries e pacotes, preço e duração específicos por cliente e por profissional. Membership compartilhada só no Premier e no Prestige. Multi-loja não entra no Essentials. — [Preço Boulevard](https://www.joinblvd.com/pricing)
- Cartão “starting at 2.65%”, ou 1% se o cliente paga 3% no programa Offset. Cartão salvo, Apple Pay e Google Pay inclusos. Repasse: o lote de um dia é depositado no seguinte e costuma cair em 2 dias úteis. Checkout no app; o hardware citado no FAQ é o Boulevard Duo no iPad. — [Preço Boulevard](https://www.joinblvd.com/pricing)
- Artigo de membership (5 mai 2026): o plano define preço, renovação, perks e quem pode comprar. O membro é cobrado na data, no cartão salvo. Perks entram no perfil a cada ciclo e se resgatam no checkout. Se o pagamento falha, o estado fica “past due” (detalhe no artigo de billing). — [Criar plano](https://support.boulevard.io/en/articles/10012451-memberships-creating-a-membership-plan)
- Renovação: duas semanas, um mês (padrão), dois, três, seis meses ou anual. Cobrança padrão no aniversário da compra, ou num dia fixo do mês (a primeira cobrança ainda é no dia da compra; as seguintes, no dia fixo). Mudar o dia do plano não rearruma quem já comprou. — [Criar plano](https://support.boulevard.io/en/articles/10012451-memberships-creating-a-membership-plan)
- Cancelamento pelo portal do cliente pode exigir permanência mínima e aviso prévio; no aviso, continua cobrando. A Boulevard cita que a regra federal de “click-to-cancel” foi barrada em tribunal e manda checar a lei do estado. — [Criar plano](https://support.boulevard.io/en/articles/10012451-memberships-creating-a-membership-plan)
- Três perks, misturáveis: (1) voucher de serviços nomeados, N por ciclo, resgatado no checkout só se aquele serviço está no carrinho — botão verde Redeem; não vale em serviço “usage-based”; pode expirar X meses após a emissão ou X após o cancelamento; (2) desconto de membro, percentual ou valor, em serviços, produtos ou itens escolhidos, que acaba ao cancelar ou pausar; (3) crédito em dólares na carteira, que acumula, não expira e paga qualquer coisa. Voucher não usado permanece após o cancelamento, sujeito à expiração; se não houver expiração, fica. — [Criar plano](https://support.boulevard.io/en/articles/10012451-memberships-creating-a-membership-plan)
- Público do plano: todos, só clientes novos, ou só quem já tem horário. Dá para vender e resgatar no mesmo dia. O cliente pode ter mais de um plano ativo. Alterar o plano não muda quem já é membro; para isso a loja cancela e vende de novo. Voucher novo só entra para o membro atual na renovação. Comissão opcional para quem vendeu. Termo de aceite no checkout, online ou no app Duo. — [Criar plano](https://support.boulevard.io/en/articles/10012451-memberships-creating-a-membership-plan)
- Billing (artigo oficial, trecho indexado): na recusa, a Boulevard marca o perfil, avisa a loja e e-maila o cliente. Se a recusa ainda pode passar, tenta de novo até mais três vezes depois da primeira — quatro no total, em cinco dias. Recusa que nunca passaria não entra na retentativa. Depois, é manual. Ao voltar a cobrar, parcelas atrasadas saem uma por dia. Existe ajuste, em beta, para perdoar atrasados e cobrar só o ciclo vigente. — [Gerir billing](https://support.boulevard.io/en/articles/8619158-memberships-managing-billing)
- Relatório de inadimplência (28 out 2025) mostra motivo da recusa, dias em atraso e valor. Outro artigo avisa que, com o perdão ligado, o “valor em atraso” não é a soma dos meses. — [Relatório out/2025](https://support.boulevard.io/en/articles/12588999-past-due-memberships-report); [Relatório novo](https://support.boulevard.io/en/articles/15901057-memberships-past-due-report)
- Precision Scheduling (artigo de 18 jul 2025): o cliente vê horários “ótimos” na reserva online, no link de remarcar e, se ligado, em Facebook, Instagram e Reserve with Google. A equipe vê selo Optimal; o cliente não vê o selo. A lógica usa os serviços mais feitos numa janela móvel de 90 dias, atualizada a cada duas semanas, e o valor/duração deles, para não abrir buraco menor que um serviço típico. No exemplo (corte de 1 hora a US$ 100, dia 9h–18h vazio), os ótimos são 9h e 17h; 13h é alternativa porque parte o dia em blocos de 4 horas. Horários de enchimento a cada 60 minutos no ajuste padrão. Espera entre troca de profissional ou recurso: no máximo 15 minutos. — [Precision Scheduling](https://support.boulevard.io/en/articles/6110033-precision-scheduling)
- Não coletei review recente de G2/Capterra/Reddit da Boulevard nesta rodada. A Capterra aparece só como ficha de preço de terceiros, e os números dela (Essentials US$ 176) não batem com a página oficial promocional acima. Prevalece joinblvd.com. — [Preço Boulevard](https://www.joinblvd.com/pricing); [Capterra](https://www.capterra.com/p/180087/Boulevard/)

### Inferences
- Este é o desenho a copiar para a mensalidade de uma barbearia: três benefícios explícitos no celular — “2 cortes neste mês” (voucher que expira no ciclo), “corte de membro por R$ X” (desconto enquanto ativo) e “R$ Y de crédito” (carteira). Cortesia ilimitada é só o caso extremo do voucher sem teto, e a Fresha já mostra que isso é um interruptor, não outro produto.
- Cobrança no cartão salvo, estado “em atraso” visível para a recepção, e-mail para o cliente, poucas retentativas e depois ação humana. Não apagar o direito no primeiro recuso.
- Na grade mobile, oferecer primeiro os horários que encostam em outro horário ou na abertura/fechamento, e ainda mostrar o resto. Não esconder a agenda.
- Preço e duração por barbeiro e por cliente (cliente habitual mais rápido) cabem numa loja só. Membership compartilhada entre unidades e AR entre lojas, não.
- Offset (cliente paga 3% para a loja ficar com 1%) é decisão comercial e regulatória, não um padrão para copiar sem advogado.

### Gaps
- Não li o artigo de billing inteiro; as quatro tentativas em cinco dias vêm do trecho indexado da URL oficial.
- Não documentei aqui objeções de review 2024–2026.
- Não confirmei se o cliente reserva sem conta ou só pelo portal. O artigo de agenda cita o link “manage appointment” no e-mail.
