# AppBarber

Sistema de gestão em nuvem da StarApp Sistemas (Chapecó/SC) para barbearia. O recorte que importa aqui é o de uma loja só: conta de cliente, agenda por profissional e clube recorrente. Rede e salão existem no produto, e o app do cliente também funciona como vitrine de vários estabelecimentos.

## O que é e para quem

O discurso oficial é “sistema da sua barbearia”: WebAdmin no navegador mais dois apps de marca AppBarber, um do cliente e um do profissional. Salão e clínica de estética são encaminhados ao AppBeleza; a central de ajuda é conjunta. O cadastro pergunta “TENHO UMA BARBEARIA/SOU BARBEIRO”. Pessoa física e pessoa jurídica podem usar. Há módulo de multiunidades no clube: o plano contratado numa unidade vale nas unidades vinculadas da mesma rede, e a tela só aparece na matriz. Blog de 10 de abril de 2026 fala em “aproximadamente 12 anos” de atuação. O perfil no Reclame Aqui traz foundingDate 2018-12-17; isso é data do perfil, não comprovação de fundação. CNPJ, razão social completa e data de fundação não foram confirmados em fonte societária. Os nomes públicos divergem: “STARAPP SISTEMAS LTDA” no Google Play e “STARAPP SISTEMAS LTDA ME” na App Store. Endereço 897-E no site e 990 no Play, e os telefones (11) 93346-5397 e (49) 98427-0516, coexistem sem definição de qual é o contato comercial vigente.

Apps: cliente Android `br.com.starapp.appbarbercli`, PRO Android `br.com.starapp.appbarberpro`, cliente iOS id 6450795073, PRO iOS id 1602535418. Login: `https://sistema.appbarber.com.br/login.php`.

## Como vendem

Promessa da home: “Uma nova experiência para uma antiga tradição” e aumentar o movimento em até 40%, sem metodologia na página. A porta de entrada documentada é autosserviço: cadastro, wizard de serviços, profissionais e jornada, e teste de 30 dias com todas as funções. A home segmenta “Sou dono”, “Trabalho em uma barbearia” e “Sou cliente”. FAQ: sem CNPJ pode usar; o cliente não paga o app; exportar a base é pelo chat online. A página de funções usa frases sem fonte (“até 5 vezes mais barato” manter cliente; consumo online “aumenta cerca de 90% todo ano”).

Na central de ajuda atualizada em 19 de janeiro de 2026, a faixa muda só pela quantidade de profissionais cadastrados, e todas as funções vêm em qualquer faixa. Quem está cadastrado conta, mesmo sem prestar serviço. Preços ([Planos e preços](https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/360001701331-Planos-e-Pre%C3%A7os-do-Sistema)):

- 1 profissional: mensal R$ 79,90 no cartão; semestral (15%) R$ 406,80 em até 6x de R$ 67,80; anual (30%) R$ 670,80 em até 12x de R$ 55,90.
- 2 a 5: mensal R$ 109,90 no cartão ou boleto; semestral R$ 559,80; anual R$ 922,80.
- 6 a 15: mensal R$ 164,50; semestral R$ 838,80; anual R$ 1.381,80.
- Mais de 15: mensal R$ 219,90; semestral R$ 1.120,80; anual R$ 1.846,80.

Semestral e anual ganham mais 5% se o pagamento for à vista no boleto, PIX ou cartão. A home lida em 13 de outubro de 2026 mostra só as faixas de 6 a 15 e de mais de 15, nos mesmos valores. A App Store do PRO cobra mensalidades menores, só pelo iTunes: R$ 59,90, R$ 89,90, R$ 144,90 e R$ 199,90. Quem não assinou pelo iTunes gerencia o plano no próprio AppBarber. A assinatura pelo iTunes não cancela no meio do período ativo.

A resposta pública da empresa no caso da Juba Barbearia trata semestral e anual como licença pré-paga: as parcelas no cartão não são mensalidades e não há reembolso, conforme os termos em `https://appbarber.com.br/termodeuso/TermosDeUso_AppBarber.pdf`. O PDF não foi lido; a regra de não estorno está na resposta, não numa citação literal do PDF. Taxa de adesão e comissão da AppBarber sobre PIX, cartão ou assinatura do cliente final: não confirmado. Se o teste de 30 dias pede cartão: a home não detalha; um artigo de cadastro de 9 de maio de 2023 diz “sem compromisso”; uma reclamação de outubro de 2026 afirma o contrário e a empresa nega cartão obrigatório (ver objeções).

## Features que importam para uma loja só

Conta do cliente no app: e-mail e senha, Google, Facebook ou Apple ID. O dono vê os logins em Cadastros > Clientes. Agendamento pelo app, pelo site gerado da barbearia e por embed. Hub de links `https://sites.appbarber.com.br/links/nomedoestabelecimento`. Agenda com jornada por dia e por período, por profissional, bloqueio, encaixe e jornada estendida. O app PRO não tem custo extra e usa o mesmo e-mail e senha. Comanda nasce com o agendamento; também abre só com produto. Comissão por serviço e/ou produto. Caixa, contas a pagar e a receber, fiado e baixa automática. Desconto automático por forma de pagamento (o artigo usa 5% no PIX como exemplo), com opção de abater ou não a comissão. A ajuda deixa claro que esse desconto não é a taxa da maquininha. A taxa de bandeira é cadastro manual; o dono pode assumir, dividir ou repassar ao profissional.

Quatro mecanismos separados: pontos de fidelidade, “Clube de Clientes” (desconto de grupo), pacote de sessões e clube de assinatura. No clube, plano comum lança o pagamento à mão; plano recorrente manda um link para o cliente preencher o cartão e cobra todo mês. Caminho: Cadastros > Clubes de Assinatura. Blog de 10 de abril de 2026 (texto comercial) acrescenta bloqueio por inadimplência, regras de uso, dias específicos para agendar e comissionamento, inclusive “por tempo”.

Lembrete padrão: push e e-mail. WhatsApp automático é crédito pré-pago, sai de um número central da plataforma, com layout padronizado. Se houver logo da loja, ela entra no cabeçalho; senão, entra a logo AppBarber/AppBeleza. Parâmetro 47 liga o lembrete se houver saldo. Parâmetro 32 inclui link de confirmação. Preço unitário do crédito: não confirmado.

Pagamento online no app, ajuda de 9 de julho de 2024: PIX (QR) ou cartão se a loja ligar a opção. Também paga pacote e plano. Serviço “A consultar” ou “A partir de” não paga online. Cancelar agendamento pago online vira crédito na loja; a ajuda não descreve estorno no cartão. Sinal via PIX entrou na versão 2.4.1 do app cliente (nota de 24 de julho de 2025). Versão 6.1.0 (2 de setembro, lida no histórico em 13 de outubro de 2026) inclui comprovante de cancelamento de assinatura. O processador do PIX e do cartão nativos não é nomeado. A integração com nome é GalaxPay/Cel.Cash, opcional, para espelhar vendas: o dono envia Galax ID e HASH à equipe, e o webhook fica na GalaxPay. Mercado Pago, API pública para o dono e Google Calendar: não confirmado. Busca por Mercado Pago, PagSeguro, Cielo e Stone junto de AppBarber não trouxe página da StarApp nomeando esses gateways no checkout. O site appbarberzap.com.br é outro produto.

App próprio (“Prime” / “AppPróprio”) só aparece como link “se você tiver”. Preço oficial: não confirmado. Uma reclamação na página da Zucchetti (7 de abril de 2026) fala em “mais de R$ 4.000” mais assinatura; é alegação de um dono, não tabela da StarApp. Vínculo societário Zucchetti–StarApp: não confirmado no site da AppBarber.

## Objeções e reclamações observadas

O app do cliente é muito bem notado e o atrito de 2025–2026 está na assinatura. Google Play Cliente: 4,9 e 131 mil avaliações ([ficha](https://play.google.com/store/apps/details?hl=pt&id=br.com.starapp.appbarbercli)). Outra leitura da mesma ficha, no mesmo dia, registra 4,9, 132 mil avaliações e 1 milhão ou mais de downloads. AppBrain (terceiro, marcado como atualizado em 12 de outubro de 2026): 4,94/5 em 131.671 avaliações e cerca de 2,3 milhões de instalações. App Store Cliente: 4,9 em 109 mil classificações. App Store PRO: 4,9 em 2,7 mil. Play PRO: 5,0 em 38 avaliações e 100 mil+ downloads; amostra pequena. Reclame Aqui: nota 6,6/10, reputação “Regular”, 25 reclamações, 100% de resposta. A taxa de solução não foi lida (a página completa deu timeout). Uma síntese automática de busca citou 60% resolvidas; isso não foi confirmado no HTML.

Cliente final: Wilker Castro, 18 de setembro de 2026, no Play, diz que a assinatura promete cortar quando quiser, mas só deixa agendar um dia por vez, e o barbeiro concorrido fecha a agenda. A StarApp respondeu que a quantidade de agendamentos simultâneos é definida pela barbearia. Robson Castro, 11 de julho de 2025: a localização, testada ao lado da própria barbearia, sugeriu locais a 7 km. helioobianchi, 20 de agosto de 2026: o salão exige o app e “funciona bem”. AllysonOliv, 3 de novembro de 2023, na App Store: precisa logar toda vez; a StarApp respondeu em 19 de janeiro de 2024 que a sessão expira e recomenda e-mail/senha ou rede social.

Reclame Aqui, 11 de agosto de 2026: cliente cancelou a assinatura mensal e foi cobrado de novo. A empresa respondeu que a AppBarber é plataforma, que as regras variam conforme o estabelecimento e que o estorno fica com a barbearia ([cobrança após cancelamento](https://www.reclameaqui.com.br/app-barber/cobranca-indevida-apos-cancelamento-de-assinatura_r3umgrPkJj7Xk7Hf/)). Avaliação de 14 de agosto de 2025: duas cobranças e o suporte teria dito que não estorna e depois que a culpa era da barbearia. “Negligência para o cancelamento”: o cliente não consegue cancelar na plataforma. Relato com fatos em 26 de março e 24 de abril de 2026: só o estabelecimento podia encerrar; no mês seguinte houve nova cobrança; a pessoa escreve que com a barbearia nunca teve problema ([negligência](https://www.reclameaqui.com.br/app-barber/negligencia-para-o-cancelamento-de-assinatura_FRPSky9CDXJIQUIV/)). Cliente de Varginha: o crédito “não apareceu” no app e “a barbearia diz nao identificar e não conseguir cancelar” ([Varginha](https://www.reclameaqui.com.br/app-barber/cobranca-indevida-recorrente-apos-cancelamento-de-assinatura-em-barbearia_vTIx5SVhUQFW6MdJ/)). Ariel Rodrigues Jacinto, 14 de setembro de 2026, no Play: cancelamento “cheio de empecilhos”. A StarApp respondeu em 18 de setembro que as condições “são definidas pela própria barbearia”.

Dono: Ledsonoriza, 5 de setembro de 2023, na App Store do app Cliente, saiu da Booksy e diz que o app passou a listar a concorrência (“fast-food de barbearia”). “Péssimo suporte”: ao migrar o clube para dentro do AppBarber, cobrança em dobro e valor na conta digital sem o cliente aparecer como assinante. Juba Barbearia: a loja fechou, as parcelas do semestral continuaram, e o dono afirma que o app segura por 30 dias o dinheiro das assinaturas dos clientes; a resposta explica o pré-pago e o não estorno; o trecho lido não confirma a retenção de 30 dias. Lista de 24 de julho de 2026: “sistema de recorrência falha na renovação automática”. Lista de 15 de setembro de 2026: cancelamento indevido com clube via Cel.Cash. São José/SC, 18 de dezembro de 2025: duas semanas para resposta no WhatsApp de ajuda. Contratante de São Paulo, 6 de outubro de 2026: cancelamento confirmado em 16 de setembro e, mesmo assim, 12 parcelas de R$ 76,90. Em 10 de outubro a contratante escreve que a barbearia “trabalha principalmente com clientes presenciais, sem agendamento”. Resposta da AppBarber em 13 de outubro de 2026: o anual parcelado não vira mensalidade; cancelar o uso não cancela as parcelas restantes; os 30 dias grátis existem sem cartão obrigatório e, neste caso, foram acrescentados ao fim do contrato; dá para bloquear agendamento online e trabalhar por ordem de chegada ([reclamação](https://www.reclameaqui.com.br/app-barber/fui-cobrado-indevidamente-pela-appbarber-apos-cancelamento_ciTnfElAXrwX_BNM/)).

Unstar resume por IA 37 avaliações de 1 a 3 estrelas (cancelamento, login, agenda, notificação em excesso). É paráfrase de agregador, não fala do usuário.

## O que copiar e o que deixar de fora

Levar para uma loja só: site e link de agendamento, jornada por profissional, confirmação de horário, sinal via PIX, recibo de comanda e comprovante de cancelamento de assinatura. A regra comercial “a faixa não esconde função” também serve: no plano de 1 profissional o sistema é o mesmo de 15.

Deixar de fora: o diretório de outras barbearias dentro do app do cliente; liquidação entre unidades e comissão que só um analista liga por e-mail; contar recepcionista como profissional só para subir de faixa; recorrência em que o cliente não cancela sozinho e a plataforma devolve o estorno para a loja; crédito interno no lugar de devolver o pagamento quando o cliente desmarca; WhatsApp de número central com frase imutável; abrir o produto com estoque, anamnese, totem e taxas de bandeira. A versão 6.1.0 mostra que o comprovante de cancelamento virou problema de produto. Prime/AppPróprio sem preço publicado não entra como item do plano padrão.

## Fontes

- https://appbarber.com.br/
- https://appbarber.com.br/funcionalidades/
- https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/360001701331-Planos-e-Pre%C3%A7os-do-Sistema
- https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/40397546209933-Tudo-sobre-o-Clube-de-Assinatura
- https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/22461255925261-Pagamento-Online-no-Aplicativo-do-cliente
- https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/5536479999373-Como-compro-cr%C3%A9ditos-WhatsApp-E-como-uso-essa-fun%C3%A7%C3%A3o-no-sistema
- https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/30902820966669-Como-Configurar-a-Integra%C3%A7%C3%A3o-com-GalaxPay
- https://blog.appbarber.com.br/2026/04/10/appbarber-clube-assinaturas-barbearia/
- https://play.google.com/store/apps/details?hl=pt&id=br.com.starapp.appbarbercli
- https://apps.apple.com/br/app/appbarber-cliente/id6450795073
- https://apps.apple.com/br/app/appbarber-pro-profissionais/id1602535418
- https://www.reclameaqui.com.br/empresa/app-barber/
- https://www.reclameaqui.com.br/app-barber/cobranca-indevida-apos-cancelamento-de-assinatura_r3umgrPkJj7Xk7Hf/
- https://www.reclameaqui.com.br/app-barber/negligencia-para-o-cancelamento-de-assinatura_FRPSky9CDXJIQUIV/
- https://www.reclameaqui.com.br/app-barber/fui-cobrado-indevidamente-pela-appbarber-apos-cancelamento_ciTnfElAXrwX_BNM/
- https://www.reclameaqui.com.br/app-barber/cobranca-indevida-e-dificuldade-n_zG3GUHArP9JsFVSe/
