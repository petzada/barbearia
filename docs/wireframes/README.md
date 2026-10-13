# Wireframes de baixa fidelidade

Telas em texto para a Barbearia do Moura. Cada caixa é uma tela de celular, no formato de app, porque o produto é web e mobile-first, sem página de divulgação ([0001](../decisoes/0001-produto-web-mobile-first-estilo-app.md)). Onde o admin precisa ver o dia inteiro da equipe, há um quadro largo: é a mesma informação, com mais colunas.

Isto não é layout final, cor, fonte nem componente. É a ordem das telas, o que cada uma mostra e o que o botão faz, preso às decisões já aceitas.

## Como ler uma caixa

```
+----------------------------------+
| título da tela                   |
|                                  |
| [ Botão ]     ação principal     |
| ( ) opção     escolha de uma     |
| [x] item      escolha marcada    |
| [ campo____]  o que a pessoa digita |
+----------------------------------+
```

Setas entre caixas (`-->`) são o caminho feliz. Os desvios ficam nomeados embaixo da caixa. Números como `0001` apontam para `docs/decisoes`.

Preço dos planos (R$ 129,90, R$ 179,90, R$ 199,90) é decisão ([0022](../decisoes/0022-planos-barbearia-do-moura.md)). Duração e valor cheio de corte e barba **não** são: onde um número desses aparece, está escrito "exemplo". Percentual de comissão também.

## Arquivos

| Arquivo | O que percorre |
| --- | --- |
| [01-entrada-login-e-conta.md](01-entrada-login-e-conta.md) | Link, celular, código, Google, conta nova, conta pré-cadastrada, instalar na tela inicial |
| [02-cliente-inicio.md](02-cliente-inicio.md) | Abas do cliente e a casa dele: próximo horário, plano, lista |
| [03-cliente-agendamento.md](03-cliente-agendamento.md) | Serviço, barbeiro, grade de 30 min, revisão coberto/avulso, confirmação |
| [04-cliente-cancelamento.md](04-cliente-cancelamento.md) | Cancelar até 2h, o que acontece depois, cancelamento e troca feitos pela casa |
| [05-cliente-planos.md](05-cliente-planos.md) | Vitrine, cartão, Pix Automático, cancelar a assinatura sozinho |
| [06-cliente-inadimplencia.md](06-cliente-inadimplencia.md) | Suspensa, regularizar, horário que cai, reativação, cancelamento por falta de pagamento |
| [07-barbeiro.md](07-barbeiro.md) | Dia, bloqueio, encaixe, pré-cadastro, fechar atendimento, valor a receber |
| [08-admin-casa.md](08-admin-casa.md) | CRM, jornada, serviços, planos, cancelar e transferir horário |
| [09-admin-financeiro.md](09-admin-financeiro.md) | Receita, comissão, lançamento e repasse marcado como pago |
| [10-mensagens-whatsapp.md](10-mensagens-whatsapp.md) | Texto do código e os avisos. Não há SMS |
| [11-mapa-dos-fluxos.md](11-mapa-dos-fluxos.md) | Os caminhos numa página só |

## Onde cada decisão aparece

| Decisão | Telas |
| --- | --- |
| [0001](../decisoes/0001-produto-web-mobile-first-estilo-app.md) web, app, sem landing | 01, 02 |
| [0002](../decisoes/0002-tres-perfis-de-usuario.md) cliente, barbeiro, admin | 02, 07, 08 |
| [0003](../decisoes/0003-escopo-funcional-por-perfil.md) o que cada um faz | 02, 07, 08, 09 |
| [0004](../decisoes/0004-assinatura-recorrente-cartao-e-pix.md) recorrência dentro do app | 05 |
| [0008](../decisoes/0008-pagamentos-mercado-pago-cartao-woovi-pix.md) Mercado Pago e Woovi | 05, 09 |
| [0009](../decisoes/0009-repasse-manual-aos-barbeiros.md) calcula, paga por fora, marca | 07, 09 |
| [0010](../decisoes/0010-whatsapp-via-whatsmiau.md) WhatsApp, dois papéis de número | 01, 10 |
| [0011](../decisoes/0011-cancelamento-ate-2h-antes.md) cancela até 2h | 03, 04 |
| [0017](../decisoes/0017-login-whatsapp-otp-e-google.md) código, Google, telefone, 90 dias | 01, 10 |
| [0018](../decisoes/0018-inadimplencia-suspende-e-reativa.md) suspende e reativa | 06, 07, 10 |
| [0020](../decisoes/0020-cadastro-aberto-admin-gerencia-no-backoffice.md) cadastro aberto, CRM | 01, 05, 08 |
| [0021](../decisoes/0021-cliente-cancela-assinatura-sozinho.md) cancela sozinho, até o fim do ciclo | 05, 10 |
| [0022](../decisoes/0022-planos-barbearia-do-moura.md) BLACK, GOLD LIMITADO, PREMIUM | 05, 08 |
| [0023](../decisoes/0023-comissao-por-barbeiro-e-servico.md) dois percentuais sobre o valor cheio | 09 |
| [0025](../decisoes/0025-uso-do-plano-ciclo-e-consumo.md) ciclo, sem acúmulo, falta consome | 02, 03, 04, 05, 07 |
| [0026](../decisoes/0026-horarios-futuros-do-assinante.md) 4 horários, 30 dias | 03, 05, 08 |
| [0027](../decisoes/0027-cobertura-do-plano-e-parte-avulsa.md) 1 visita = 1 uso; o resto é avulso | 03, 07 |
| [0029](../decisoes/0029-avulso-presencial-e-confirmacao-de-atendimento.md) avulso no balcão; fechar atendimento | 03, 07, 09 |
| [0031](../decisoes/0031-whatsmiau-planos-e-numeros-por-fase.md) 1 número no piloto, 2 depois | 10 |
| [0032](../decisoes/0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md) jornada e bloqueio | 07, 08, 10 |
| [0033](../decisoes/0033-duracao-dos-servicos-e-grade-30-min.md) duração e grade | 03, 07, 08 |
| [0034](../decisoes/0034-agendamento-feito-pela-barbearia.md) a casa marca; pré-cadastro; encaixe | 01, 07, 08 |
| [0035](../decisoes/0035-antecedencia-minima-2h.md) cliente só marca com 2h | 03, 07 |

Sem tela, de propósito: debate antes de construir ([0005](../decisoes/0005-processo-debate-antes-de-construir.md)), stack ([0006](../decisoes/0006-monolito-typescript-tailwind-postgres.md), [0015](../decisoes/0015-tanstack-start-better-auth-drizzle.md)), arquivos ([0007](../decisoes/0007-storage-cloudflare-r2.md)), uma loja por deploy ([0012](../decisoes/0012-uma-barbearia-agora-replicar-depois.md), [0019](../decisoes/0019-um-codigo-varios-deploys-barbearia-id.md)), Railway ([0014](../decisoes/0014-hospedagem-railway.md)), fila ([0016](../decisoes/0016-fila-de-jobs-pg-boss.md)) e titular das contas de pagamento ([0030](../decisoes/0030-contas-dos-provedores-de-pagamento-por-fase.md)). A fila aparece só como efeito: o horário do inadimplente cai 2h antes sem ninguém apertar botão.

[0013](../decisoes/0013-sem-avulso-assinatura-para-clientes-escolhidos.md) e [0028](../decisoes/0028-pagamento-avulso-no-app.md) foram substituídas. O desenho segue [0020](../decisoes/0020-cadastro-aberto-admin-gerencia-no-backoffice.md) e [0029](../decisoes/0029-avulso-presencial-e-confirmacao-de-atendimento.md): qualquer um assina, e avulso não se paga no app.

## O que foi olhado nos outros produtos

A pesquisa em `docs/pesquisas` e os prints em `docs/referencias-visuais` entram como jeito de organizar a tela, não como regra. A regra continua sendo a decisão.

Entram no desenho:

- **Booksy (Brasil):** o cliente agenda ou a casa cadastra; baixar app de loja é opcional. A reserva pede serviço, profissional e horário, e a política aparece antes de confirmar.
- **Gendo e GlossGenius:** o link da casa abre no navegador. A GlossGenius ainda deixa reservar sem conta; aqui não, porque o telefone é a conta.
- **theCut:** a conta do cliente nasce de nome e telefone, e o link da loja não deve empurrar outra loja de aplicativos.
- **Fresha:** pacote com N sessões abate sozinho na revisão, e o item coberto vai a zero. Lá, cancelar a membership corta o saldo. Aqui o pago vale até o fim do ciclo, no espírito do voucher que a Boulevard deixa permanecer.
- **Boulevard:** recusa de cartão fica visível ("past due") para a recepção e para o cliente, com retentativa, em vez de apagar o horário na primeira falha.
- **ShavingPass e a reclamação do Wilker Castro (AppBarber):** a cota, o "não acumula" e quantos horários dá para segurar ao mesmo tempo estão na primeira leitura do plano. A BARBR publica "até 3 horários à frente" no plano de cima; aqui o número é 4, até 30 dias, e os dois são configuráveis.
- **AppBarber:** jornada, bloqueio e encaixe no app de quem atende; comprovante quando a assinatura é cancelada; o cliente não fica refém do estabelecimento para encerrar a cobrança.
- **BestBarbers:** clube em cartão ou Pix, e a maquininha só é registrada no sistema. Combina com avulso pago no balcão.
- **Square Appointments, Fresha e Booksy Biz:** o dia da equipe em colunas, no quadro largo do admin.

Ficam de fora do desenho, porque a decisão não pediu ou descartou: marketplace e "barbearias perto", depósito e pré-autorização (Booksy, theCut, Horarius), fila de espera, pontos, estoque, avaliação, gorjeta, pagamento do corte no celular, SMS pago, código por e-mail, convite para vincular o Google no primeiro acesso.

## O que estas telas não decidem

- Valor cheio e duração de cada serviço (o admin cadastra; a grade é de 30 minutos).
- Percentual de cada barbeiro.
- Janela máxima para quem **não** é assinante marcar avulso. A de 30 dias é regra do horário de plano.
- Trocar o telefone de uma conta já existente.
- Se o serviço coberto, com a cota zerada, pode ser marcado pagando o valor cheio. A tela só impede o horário de plano.
- O que acontece com o uso já reservado quando a suspensão pega um horário a menos de 2 horas. A decisão manda atender como avulso; não diz se o uso volta.
- Se o lembrete de quem foi pré-cadastrado na cadeira sai antes do aceite de avisos. As duas decisões existem e ainda não se encontram.
