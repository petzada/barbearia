# Como ler

Estes arquivos descrevem o que sistemas de barbearia e de salão publicam, o que donos e clientes reclamam, e o que a documentação do Mercado Pago Brasil permite cobrar todo mês numa conta só. O relatório em `reports/Apps de barbearia uma loja.md` é a narrativa. Aqui está o mapa, sem repetir os dossiês.

Leia nesta ordem se o objetivo é decidir o que construir:

1. `23-decisao-uma-loja.md` — o que entra no site de uma loja e o que fica de fora. Separa fato de inferência.
2. `22-mercado-pago-recorrente.md` — cartão recorrente, Pix, webhook e o que não está escrito.
3. `21-clube-de-assinatura.md` — a frase que a barbearia anuncia e a regra que a cadeira aguenta.
4. `20-objecoes.md` — cancelamento, anual que continua e app obrigatório, com as URLs.
5. `01-appbarber.md` — o sistema que a loja não deve copiar por inteiro, e o que nele já serve.
6. `33-precos-e-monetizacao.md` — tabelas de preço, formas de cobrança e uma proposta para a Barbearia do Moura. A proposta não é decisão.

Os produtos brasileiros com preço ou ficha própria vêm em seguida, do mais citado ao mais fino. Booksy e Fresha juntam a página do Brasil e a de fora.

| Arquivo | O que cobre |
| --- | --- |
| `33-precos-e-monetizacao.md` | Tabelas de preço, formas de cobrança e proposta para a Barbearia do Moura. Não é decisão |
| `02-trinks.md` | Salão em rede, preço por faixa, clube via pagar.me, Reclame Aqui |
| `03-avec.md` | Até 2 e até 5 profissionais, WhatsApp no plano, Avec Pay sem processador nomeado |
| `04-booksy.md` | Marketplace, preço BR/EUA/UK, depósito, waitlist, Boost |
| `05-fresha.md` | Comissão de 20%, membership com sessões, WhatsApp depois da franquia |
| `06-simples-agenda.md` | Link e WhatsApp no plano, preço por profissional desde 2016 |
| `07-belasis.md` | Lite com vendas por assinatura; API só no Scale |
| `08-gendo.md` | Link sem app, clube no cartão, taxa do clube não publicada |
| `09-bestbarbers.md` | App de marca a partir de R$ 299, clube em cartão ou Pix |
| `10-modo-gestor.md` | Preço único, Mercado Pago com +1,5% deles, app de marca +R$ 99 |
| `11-barsystem.md` | Assinatura do cliente via Asaas, link em subdomínio |
| `12-barbeiro-app.md` | Reserva sem conta, Mercado Pago entre outros gateways |
| `13-barber-pro.md` | Página pública sem conta; clube só no plano Equipe; Asaas |
| `14-barberium.md` | Free com teto de agendamentos; assinatura de clientes no Pro |
| `15-horarius.md` | Profissionais ilimitados, sinal por Pix, clube; meio da mensalidade não confirmado |
| `16-squire.md` | Uma loja sem revender a base; fidelidade só no plano de rede |
| `17-thecut.md` | Link e pré-autorização; taxa no cliente e US$ 10 por lead |
| `18-glossgenius.md` | Reserva sem login e sem app; membership no plano de entrada |
| `19-square-appointments.md` | Agenda madura; mensalidade de serviços ainda pedida na comunidade em 2026 |
| `24-boulevard.md` | Voucher, desconto e crédito; atraso e retentativa. O número 24 existe porque 20–23 são os temas |

Fichas curtas, com menos preço ou com viés de quem se compara ao AppBarber:

| Arquivo | O que cobre |
| --- | --- |
| `25-genda.md` | Link e WhatsApp; preços autoatribuídos |
| `26-eicortei.md` | Link no navegador; clube “ainda não” |
| `27-opero.md` | Comparativo de vendedor; R$ 59 autoatribuído |
| `28-barberzap.md` | Grátis de um barbeiro; preço pago não extraído |
| `29-quaddro.md` | Agenda horizontal; secretária de IA a R$ 299 |
| `30-beleza-soft.md` | Programa para baixar; agendamento online não confirmado |
| `31-sistema-vip.md` | Página genérica; não é a marca Salão VIP |
| `32-hora-marcada.md` | “App exclusivo” sem loja nomeada e sem preço |

Nomes sem arquivo: NaRégua (a URL direta retornou 404 em 13 de outubro de 2026), Agendou (sem página de produto), BelezaEasy (página de produto não confirmada), Calendly (não é sistema brasileiro de barbearia), BarberCode e EiBarber (citados sem página de preço), Atendize (central de WhatsApp, fora do conjunto), Mangomint (sem ficha), Salão VIP como marca separada (não apareceu; o hit é o Sistema VIP). Stay Off, Lion, Sartorial, BarbeirosFC, Reizor, ShavingPass, BarberClock, BARBR e barber.rsvp entram em `20` ou `21`: são preço de concorrente ou anúncio de clube, não um sistema com ficha própria.

Preço, nota, taxa e reclamação ficam com a URL já citada. Onde um dossiê marca “não confirmado”, o rótulo permanece.

Os prints das telas estão em `referencias-visuais`, com a mesma numeração destes arquivos. O que cada pasta contém, e o que não foi capturado, está no `README.md` dessa pasta. Data da coleta: 13 de outubro de 2026.
