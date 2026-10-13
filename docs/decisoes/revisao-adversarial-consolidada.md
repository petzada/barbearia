# Revisão adversarial das 51 decisões — registro para validação

- **Projeto:** Barbearia do Moura.
- **Base documental:** decisões 0001 a 0051 e `README.md` de `docs/decisoes`, lidos integralmente antes da primeira pergunta.
- **Data da base documental:** 13/10/2026.
- **Status:** respostas escolhidas pelo dono do produto nesta conversa, consolidadas para validação posterior. Não é registro de implementação.
- **Preservação:** os 51 documentos originais e o índice não foram alterados. Este é o único arquivo novo produzido pela revisão.
- **Incorporação (2026-10-13):** as escolhas deste registro foram incorporadas às decisões 0052 a 0078, e cada decisão de 0001 a 0051 ganhou uma seção "Revisão adversarial" com o que mudou. Este arquivo fica como registro histórico das perguntas.
- **Método:** revisão das decisões vigentes, de suas substituições e das conexões entre agenda, identidade, assinatura, pagamentos, usos, comissões, comunicação e operação. Os contrapontos foram apresentados e respondidos individualmente.
- **Numeração:** Q01–Q51 identifica as perguntas desta revisão; D0001–D0051 identifica os documentos originais. Não existe correspondência de um para um entre essas duas sequências.
- **Fidelidade:** as decisões antigas abaixo são sínteses, não transcrições literais. As escolhas registram o resultado das respostas, inclusive recusas e alterações das propostas. Uma proposta do revisor não constitui aprovação quando o usuário escolheu outro caminho.

## Leitura e precedência deste registro

Este arquivo reúne mudanças propostas e escolhas humanas para posterior validação. Não marca documentos originais como substituídos nem modifica formalmente o índice. Onde a conversa alterou uma escolha anterior, a seção de conexões explicita o resultado final. Os documentos históricos devem continuar distinguíveis do resultado desta revisão.

Em particular, Q46 substitui, no resultado desta revisão, o cancelamento automático de reservas por inadimplência que ainda era pressuposto nas primeiras perguntas. Q39 e Q40 refinam o crédito de reposição aprovado em Q22. Q23 refina o encerramento de conta de Q10. A exceção de equipe em Q16 foi expressamente aprovada na resposta seguinte, junto com Q17.

## Perguntas, contrapontos e decisões escolhidas

### Q01 — Uma quitação e uma liberação de usos por ciclo

**Decisão antiga e conexões:** [D0018] mantém retentativas automáticas e permite pagamento manual para regularizar. [D0025] diz que cada pagamento aprovado libera usos; [D0008] prevê dois provedores.

**Contraponto perguntado:** pagamento manual e retentativa podem aprovar a mesma obrigação duas vezes. Vincular benefícios a cada aprovação, sem identificar o ciclo quitado, pode duplicar cobrança e usos. Foi proposta uma única quitação e liberação de usos por ciclo, com devolução de cobrança duplicada.

**Decisão escolhida — aceita:** uma quitação e uma liberação de usos por ciclo; eventual cobrança duplicada deve ser devolvida. A identidade da obrigação precisa sobreviver às diferentes tentativas de pagamento.

### Q02 — Pagamento atrasado reinicia o ciclo

**Decisão antiga e conexões:** [D0018], [D0025] e [D0026] permitem regularização e reservas futuras, mas não fecham o efeito do atraso sobre os limites do ciclo.

**Contraponto perguntado:** manter o vencimento original encurta o período utilizável após a suspensão; reiniciar o ciclo exige alterar a próxima cobrança e recalcular reservas. O revisor recomendou manter o calendário da obrigação pendente.

**Decisão escolhida — alternativa à recomendação:** o pagamento atrasado inicia um novo ciclo mensal a partir do pagamento, muda a próxima cobrança e recalcula a cobertura dos horários já marcados. O cliente só acessa benefícios com a assinatura regularizada; sem cobertura, o atendimento é avulso, sujeito ao aceite e às demais regras desta revisão. Q05 define o instante de referência.

### Q03 — Reserva, comprometimento e desfecho do uso

**Decisão antiga e conexões:** [D0025] associa consumo ao limite de cancelamento; [D0029] associa consumo à confirmação do atendimento. [D0032] determina devolução quando a barbearia cancela.

**Contraponto perguntado:** dois eventos poderiam descontar o mesmo uso. Foi proposta a separação de etapas, sem desconto duplicado.

**Decisão escolhida — aceita:** ao agendar, um uso fica reservado e indisponível para outra reserva. Ao atingir o prazo de cancelamento, esse mesmo uso fica comprometido. Marcar realizado ou falta registra o desfecho, sem novo desconto. Somente atendimento realizado gera comissão. Cancelamento pela barbearia devolve o benefício conforme Q22, Q39 e Q40.

### Q04 — Concordância para atender como avulso

**Decisão antiga e conexões:** [D0018] mantém reservas quando a suspensão ocorre a menos de duas horas e prevê avulso se não houver regularização. [D0027] exige apresentação do valor antes da confirmação.

**Contraponto perguntado:** uma reserva originalmente coberta pode virar cobrança quando o cliente já não pode cancelar pelo fluxo normal. Foi proposto manter a reserva com escolha explícita, sem presumir aceite do avulso.

**Decisão escolhida — aceita:** manter o horário e oferecer regularização da assinatura, avulso com preço explícito ou cancelamento sem penalidade. Se o cliente chegar sem escolher, a equipe confirma o preço e obtém concordância no balcão antes do serviço. Q46 estende esse tratamento às reservas durante a suspensão, retirando o cancelamento automático por inadimplência.

### Q05 — Benefícios sem retroatividade

**Decisão antiga e conexões:** [D0018] e [D0029], combinadas com Q02, não distinguiam pagamento e atendimento ocorridos em horários diferentes do mesmo dia.

**Contraponto perguntado:** um avulso realizado pela manhã poderia ser reinterpretado como coberto por uma mensalidade aprovada à tarde. Foi proposta ativação a partir do instante efetivo da aprovação.

**Decisão escolhida — aceita:** vale o horário de aprovação registrado pelo provedor, sem retroatividade. Avulsos anteriores mantêm receita e comissão. A mensalidade aprovada libera os usos integrais do novo ciclo. A chegada tardia da informação ao app não muda o instante de aprovação que deve ser considerado.

### Q06 — Google secundário e vínculo obrigatório com WhatsApp

**Decisão antiga e conexões:** [D0017] exige WhatsApp no primeiro acesso por Google, não incentiva a vinculação e mantém sessão longa. [D0031] concentra login e mensagens em um número no piloto. [D0021] depende de acesso para cancelar pelo app.

**Contraponto perguntado:** Google só recupera acesso durante uma falha do envio de códigos se já estiver vinculado. Foi sugerido oferecer explicitamente a vinculação após o primeiro login, de forma opcional.

**Decisão escolhida — funcionamento esclarecido, incentivo não aprovado:** WhatsApp cadastrado é obrigatório para todo cliente. Quem escolhe Google confirma o WhatsApp por código na primeira vinculação; depois entra pelo Google sem repetir o código. Quem usa apenas WhatsApp solicita código a cada novo login. Isso não significa exigir código a cada abertura enquanto a sessão continua válida. Não foi aprovada uma campanha ou etapa adicional para incentivar o vínculo com Google; não se registra a proposta como aceita.

**Limitação mantida:** sem Google previamente vinculado nem sessão válida, o acesso continua dependendo do envio do código de WhatsApp. Não foi escolhido outro canal independente de autenticação.

### Q07 — Identificador permanente e troca de telefone

**Decisão antiga e conexões:** [D0017] trata telefone como identidade única; [D0034] associa o histórico do pré-cadastro ao login com o mesmo número.

**Contraponto perguntado:** posse atual de um número não comprova, por si só, identidade histórica; troca, reutilização ou erro de cadastro podem vincular dados à pessoa errada.

**Decisão escolhida — aceita:** a conta possui identificador interno permanente. WhatsApp continua obrigatório, verificado e utilizável para acesso. Trocar o número preserva assinatura e histórico mediante autenticação da conta existente e verificação do novo número. Sem acesso à conta, recuperação exige conferência assistida, sem transferir automaticamente histórico apenas pela posse de um número.

### Q08 — Proteção de ações administrativas sensíveis

**Decisão antiga e conexões:** [D0017] permite sessão de 90 dias renovada pelo uso; [D0002], [D0009], [D0015] e [D0040] concedem poderes relevantes à equipe e ao admin.

**Contraponto perguntado:** uma sessão longa em aparelho acessível permite ações sensíveis sem nova comprovação de identidade.

**Decisão escolhida — aceita:** manter sessão longa no cotidiano e exigir autenticação recente para ações administrativas sensíveis, como alterar permissões, dados de integração ou marcar repasses pagos. Consultar agenda e confirmar atendimentos não exige novo login por essa regra. Saída da equipe revoga imediatamente suas permissões e sessões de trabalho. A definição técnica da janela de autenticação recente não foi feita nesta conversa.

### Q09 — Pedido de cancelamento durante indisponibilidade do provedor

**Decisão antiga e conexões:** [D0021] só confirma cancelamento após confirmação do provedor, mantendo benefício até o fim do ciclo pago.

**Contraponto perguntado:** uma falha externa pode atrasar a efetivação e permitir nova cobrança depois de o cliente pedir cancelamento.

**Decisão escolhida — aceita:** registrar imediatamente data, hora e protocolo do pedido; mostrar a solicitação pendente sem anunciar conclusão falsa. Tentar até obter confirmação, com falhas persistentes como pendência para o admin. Considerar o instante do pedido: cobrança de renovação referente a ciclo iniciado depois da solicitação deve ser devolvida. O ciclo anteriormente pago mantém benefícios até seu término.

### Q10 — Exclusão de conta ao fim do período pago

**Decisão antiga e conexões:** [D0046] combina cancelamento e anonimização; [D0021] preserva acesso ao ciclo pago; [D0026] permite reservas futuras.

**Contraponto perguntado:** anonimizar imediatamente impede uso de benefícios ainda válidos. Foram oferecidas duas opções ao cliente: encerramento imediato ou ao fim do ciclo.

**Decisão escolhida — simplificação solicitada:** haverá uma única regra: interromper renovação imediatamente, manter a conta até o fim do ciclo pago e então concluir a exclusão. Informar esse funcionamento ao solicitar. A conclusão também aguarda devoluções e pendências que dependam de identificação. Q23 acrescenta o tratamento de crédito de reposição ainda válido. Não haverá opção de encerramento imediato prevista nesta revisão.

### Q11 — Significado limitado e explícito de SAIR

**Decisão antiga e conexões:** [D0051] diz que SAIR desliga mensagens do telefone; [D0046] mantém transacionais obrigatórias; [D0017] depende de códigos e [D0045] prevê lembretes opcionais.

**Contraponto perguntado:** desligar tudo impede o login; continuar enviando tudo contradiz a promessa de saída.

**Decisão escolhida — aceita:** SAIR desliga somente lembretes opcionais. A resposta deve explicar que códigos solicitados e avisos essenciais de agendamentos e assinatura continuam. A preferência permanece após ativação do pré-cadastro. Esta é a escolha funcional, não um parecer jurídico sobre comunicações.

### Q12 — Sem verificação de margem dos planos

**Decisão antiga e conexões:** [D0022] fixa preços e usos; [D0023] calcula comissão sobre valor cheio com percentual de assinante inicialmente igual ao avulso; [D0049] define bases dos combos.

**Contraponto perguntado:** dependendo dos preços e percentuais configurados, quatro utilizações podem gerar comissões superiores à mensalidade. Foi proposta simulação de margem e confirmação explícita em configuração negativa. O exemplo usado na pergunta era hipotético, não um diagnóstico dos custos reais.

**Decisão escolhida — proposta rejeitada:** manter cadastro sem essa verificação. Preços dos planos e comissões são decisões de negócio do administrador da barbearia; a plataforma e o dono do produto não se envolvem nessa avaliação. Não implementar simulador, bloqueio ou confirmação de margem com base nesta revisão.

### Q13 — Teto opcional de assinaturas por plano

**Decisão antiga e conexões:** [D0020] abre contratação a qualquer cliente; [D0026] limita reservas individuais; [D0022] restringe dias de alguns planos.

**Contraponto perguntado:** limite individual de reservas não limita o total de assinantes nem garante capacidade de atendimento.

**Decisão escolhida — aceita:** admin configura teto opcional de assinaturas por plano. Ao atingir o teto, novas contratações ficam indisponíveis até aumento do limite ou liberação de vaga. O admin define o número e o sistema aplica. Q14, Q48 e Q49 detalham a ocupação.

### Q14 — Ocupação de vagas durante suspensão e cancelamento

**Decisão antiga e conexões:** [D0018] permite reativação; [D0021] mantém benefícios até o fim do ciclo; Q13 cria teto.

**Contraponto perguntado:** liberar uma vaga durante suspensão pode produzir excesso quando o assinante regulariza.

**Decisão escolhida — aceita:** reservar a vaga durante a possibilidade de reativação pelas retentativas. Cancelamento ocupa vaga até terminar o ciclo pago. A vaga é liberada no encerramento efetivo da assinatura. Redução do teto abaixo da quantidade existente preserva as assinaturas atuais e bloqueia novas contratações enquanto não houver vaga.

### Q15 — Uso extra não aumenta o limite de reservas

**Decisão antiga e conexões:** [D0040] permite cortesia e devolução de uso; [D0026] limita reservas simultâneas.

**Contraponto perguntado:** conceder quinto uso não permite necessariamente manter cinco reservas; saldo e limite são controles diferentes.

**Decisão escolhida — aceita com restrição de interface:** conceder uso extra aumenta saldo, sem aumentar automaticamente o limite de reservas simultâneas. Pode marcar outra visita quando uma reserva existente deixar de ocupar o limite. Não criar tela separada mostrando usos disponíveis ou reservas permitidas por causa dessa regra.

### Q16 — Limite geral de agendamentos futuros por cliente

**Decisão antiga e conexões:** [D0026] limita reservas de plano, enquanto [D0029] não cobra falta avulsa e [D0020] permite agendamento aberto.

**Contraponto perguntado:** reservas avulsas sem limite contornam o controle de ocupação, inclusive para assinantes.

**Decisão escolhida — aceita, com complemento posterior expresso:** admin configura limite geral de agendamentos futuros por cliente, contando plano e avulso juntos. O limite específico do plano continua valendo dentro do total. A equipe pode ultrapassar o limite geral ao marcar pelo balcão, com justificativa registrada. Essa exceção, inicialmente não confirmada, foi expressamente aprovada na resposta a Q17.

### Q17 — Aceite para reservas que perdem cobertura em troca de plano

**Decisão antiga e conexões:** [D0039], [D0050], [D0026] e [D0027] permitem reclassificar reservas conforme mudança ou não efetivação de plano, com aviso.

**Contraponto perguntado:** aviso de troca não equivale a concordância com nova cobrança pelo atendimento reservado.

**Decisão escolhida — aceita:** mostrar horários afetados e preços antes de confirmar a troca. Cliente escolhe manter como avulso mediante aceite ou cancelar sem penalidade. Se a cobertura mudar posteriormente, solicitar a escolha novamente, sem presumir concordância com cobrança.

### Q18 — Versionamento dos benefícios contratados

**Decisão antiga e conexões:** [D0022] permite editar serviços, dias e usos; [D0042] define aviso para preço, mas não para alterações de benefícios.

**Contraponto perguntado:** editar o cadastro diretamente pode retirar condições já contratadas.

**Decisão escolhida — aceita:** preservar benefícios por versão. Alterações criam nova versão para novas contratações; assinantes existentes mantêm condições anteriores até aceitarem migração. Reajustes exclusivamente de preço seguem a regra de aviso de 30 dias. Q49 determina que versões compartilham o teto do plano.

### Q19 — Atendimento realizado e pagamento são estados distintos

**Decisão antiga e conexões:** [D0029] associa realizado à confirmação de pagamento avulso; [D0023] gera comissão por serviço realizado; [D0038] reúne receitas.

**Contraponto perguntado:** atendimento pode acontecer sem pagamento integral, e não deve ser escondido nem gerar recebimento fictício.

**Decisão escolhida — aceita com destaque para assinatura:** realização gera comissão conforme configuração. Pagamento avulso pode ficar pendente, parcial ou quitado. Financeiro reconhece como recebido somente o valor confirmado e mantém o restante pendente. Parte coberta por assinatura regularizada já está paga pela mensalidade: realizado gera comissão, sem nova cobrança ou lançamento duplicado de receita. Em visita mista, só a parte avulsa exige confirmação de recebimento.

### Q20 — Correção de atendimento restrita ao admin

**Decisão antiga e conexões:** [D0009] e [D0041] preservam lançamentos; [D0040] permite devolver uso, mas isso não corrige por si só receita e comissão de um atendimento errado; [D0029] gera esses efeitos.

**Contraponto perguntado:** corrigir realizado para falta exige ajustar efeitos relacionados, não apenas conceder uso.

**Decisão escolhida — aceita:** admin pode corrigir atendimento, com motivo obrigatório e histórico preservado. Gerar ajustes correspondentes de uso, comissão e recebimento, sem apagar lançamentos anteriores. Corrigir um registro de pagamento não efetua automaticamente devolução de dinheiro; devolução real é tratada separadamente. Se o desfecho correto for falta sujeita à penalidade, o uso continua consumido.

### Q21 — Aplicação automática de combo equivalente

**Decisão antiga e conexões:** [D0033] e [D0049] dão ao combo preço e duração próprios; [D0036] permite vários serviços e [D0023] calcula comissão sobre suas bases.

**Contraponto perguntado:** escolher combo ou exatamente os mesmos componentes separados pode produzir preço, duração e comissão diferentes para o mesmo conjunto de serviços.

**Decisão escolhida — aceita:** aplicar automaticamente o combo cadastrado quando a seleção corresponder exatamente aos componentes, mostrando o ajuste antes da confirmação. Em seguida aplicar as regras de cobertura já decididas: combo totalmente coberto ou totalmente avulso utiliza seus valores próprios; cobertura parcial utiliza preços e comissões dos componentes e mantém duração do combo.

### Q22 — Crédito de reposição por cancelamento da barbearia

**Decisão antiga e conexões:** [D0032] devolve uso; [D0025] faz usos expirarem no fim do ciclo.

**Contraponto perguntado:** devolver uso no último dia do ciclo pode tornar a reposição impossível de aproveitar.

**Decisão escolhida — aceita:** devolver como crédito de reposição válido por 30 dias a partir do cancelamento, preservando serviços e dias permitidos do plano original. Não exige renovar assinatura, não muda próxima cobrança e, ao ser utilizado, gera comissão de atendimento coberto pelo plano. Q39 limita sua concessão a benefício já pago; Q40 trata cancelamentos posteriores.

### Q23 — Crédito de reposição adia conclusão da exclusão

**Decisão antiga e conexões:** [D0046], [D0021] e Q10 encerram após o ciclo pago; Q22 pode criar benefício com validade posterior.

**Contraponto perguntado:** encerrar a conta no fim do ciclo impede uso do crédito ainda válido.

**Decisão escolhida — aceita:** concluir exclusão após uso ou vencimento do crédito, mantendo renovação interrompida e informando a nova data prevista de encerramento. Conta fica disponível para utilizar o benefício restante, além de observar outras pendências de Q10.

### Q24 — Autonomia do barbeiro para bloqueios pontuais

**Decisão antiga e conexões:** [D0032] atribui jornada ao admin, mas permite bloqueios em horários livres pelo barbeiro.

**Contraponto perguntado:** bloquear todos os horários livres de um período pode esvaziar a jornada definida pelo admin. Foi proposto limite semanal configurável, com aprovação acima dele.

**Decisão escolhida — proposta rejeitada:** manter autonomia para bloqueios pontuais, sem limite de horas configurado pelo admin. Permanecem as regras originais de horário livre, notificação ao admin e possibilidade de ele desfazer bloqueios. Não acrescentar aprovação prévia por volume de horas.

### Q25 — Cancelamento tardio libera o horário

**Decisão antiga e conexões:** [D0011] permite cancelar até duas horas antes; [D0025] penaliza desistência tardia e [D0029] não cobra falta avulsa.

**Contraponto perguntado:** bloquear cancelamento tardio impede liberar uma vaga que a equipe poderia aproveitar.

**Decisão escolhida — aceita:** permitir cancelamento tardio pelo app, com aviso explícito de não devolução do uso comprometido. Liberar horário imediatamente e notificar equipe. Avulso segue sem cobrança por cancelamento ou falta. Histórico distingue cancelamento tardio de falta sem aviso. Exceções sem penalidade por mudança de cobertura ou ação da barbearia continuam valendo.

### Q26 — Antecedência mínima e prazo de cancelamento independentes

**Decisão antiga e conexões:** [D0035] associa antecedência mínima de duas horas ao prazo de [D0011]; [D0034] oferece encaixe pela equipe.

**Contraponto perguntado:** após Q25, impedir marcação próxima só para garantir cancelabilidade deixa de ser necessário; pode continuar sendo escolha operacional.

**Decisão escolhida — aceita:** admin configura independentemente antecedência mínima para agendar e prazo de cancelamento sem perda de uso. Se a reserva for permitida dentro do prazo de perda de uso, informar antes de confirmar que o uso ficará comprometido imediatamente. Não foi escolhido um novo valor padrão nesta revisão.

### Q27 — Prazo de cancelamento preservado por reserva

**Decisão antiga e conexões:** [D0011], [D0035] e Q26 passam a permitir configuração do prazo.

**Contraponto perguntado:** aumentar prazo depois de reservar pode retirar retroativamente a oportunidade de cancelar sem penalidade.

**Decisão escolhida — aceita:** cada agendamento guarda o prazo vigente na sua confirmação. Alterações do admin valem para novas reservas; as existentes mantêm a condição informada ao cliente.

### Q28 — Filtro opcional por barbeiro

**Decisão antiga e conexões:** [D0036] rejeita filtro e exige serviço → horário → barbeiro; [D0037] exige habilitação para todos os serviços.

**Contraponto perguntado:** cliente fiel precisa testar horários repetidamente para encontrar seu profissional.

**Decisão escolhida — aceita:** manter fluxo atual como padrão e adicionar filtro opcional por barbeiro. Mostrar apenas horários compatíveis com a disponibilidade do profissional e todos os serviços escolhidos.

### Q29 — Informações públicas, disponibilidade somente após login

**Decisão antiga e conexões:** [D0048] limita conteúdo público a planos e benefícios; [D0043] havia permitido exploração mais ampla, mas foi substituída.

**Contraponto perguntado:** exigir login antes de verificar disponibilidade impede avaliar se a oferta atende ao cliente. Foi proposta consulta pública de serviços, barbeiros e horários.

**Decisão escolhida — aceite parcial:** sem login, mostrar benefícios, planos, serviços prestados e lista de barbeiros. Não mostrar dias ou horários disponíveis. Fluxo de agendamento, escolha de serviço com profissional e horário, e contratação de plano exigem login. Não restaurar integralmente a navegação pública de D0043.

### Q30 — Gestão sensível permanece no desktop

**Decisão antiga e conexões:** [D0047] mantém resumo mobile e backoffice desktop, com exceções de agenda; [D0040] e Q20 exigem ações operacionais do admin.

**Contraponto perguntado:** correções e devoluções de uso podem ser necessárias no balcão quando só há celular. Foi proposto disponibilizar essas ações no mobile.

**Decisão escolhida — proposta rejeitada:** decisões sensíveis e de gestão ficam no backoffice desktop. Mobile do admin oferece visualização rápida, insights e KPIs. Permanecem as ações de agenda explicitamente previstas em D0047; a resposta não foi usada para retirar esses poderes já existentes. Q31 acrescenta acesso a notificações, sem transferir ações sensíveis para mobile.

### Q31 — Notificações e pendências persistentes por perfil

**Decisão antiga e conexões:** [D0044] usa Web Push para equipe; [D0047] separa superfícies; [D0038] já prevê pendências de atendimento.

**Contraponto perguntado:** aviso não visto não pode ser a única representação de algo que exige ação. Foi proposta lista persistente, independente do push.

**Decisão escolhida — aceita e ampliada:** tela inicial de cliente, barbeiro e admin terá botão para notificações relevantes a cada perfil, respeitando responsabilidades. Push é aviso. Pendência permanece até ser resolvida, independentemente de abrir a notificação. A existência dessa área no cliente não aprova push para clientes; os canais externos originais continuam. Ações sensíveis do admin permanecem no desktop.

### Q32 — Lembretes conferem o estado atual da reserva

**Decisão antiga e conexões:** [D0045] prevê lembretes 24h e 3h antes com prazo de cancelamento; Q26 e Q27 tornam esse prazo variável e preservado por reserva.

**Contraponto perguntado:** mensagem atrasada ou prazo maior que três horas pode prometer cancelamento sem penalidade quando isso já não vale.

**Decisão escolhida — aceita com simplificação do texto:** manter 24h e 3h e conferir a reserva no envio. Não enviar para horários cancelados ou já passados. Informar o prazo real se ainda estiver vigente. Se tiver vencido, enviar apenas lembrete de atendimento, sem explicar nesse lembrete liberação de horário ou devolução de uso. Isso não remove o aviso explícito exigido na ação de cancelamento tardio por Q25.

### Q33 — Ajuste no primeiro período ainda aberto

**Decisão antiga e conexões:** [D0041] manda ajustes após fechamento para o mês seguinte.

**Contraponto perguntado:** o mês seguinte ao atendimento também pode estar fechado quando o erro for descoberto.

**Decisão escolhida — aceita:** registrar ajuste no primeiro período ainda aberto, referenciando atendimento e mês de origem, sem modificar fechamentos anteriores.

### Q34 — Repasses parciais aos barbeiros

**Decisão antiga e conexões:** [D0009] e [D0041] permitem marcar pagamento do barbeiro, sem detalhar pagamentos parciais.

**Contraponto perguntado:** status binário não representa um fechamento pago em parcelas.

**Decisão escolhida — aceita:** registrar cada repasse com valor e data; manter total devido, total pago e saldo pendente. Fechamento só fica quitado quando pagamentos cobrirem o devido. Correções preservam histórico.

### Q35 — Recebimentos, pendências e comissões separados

**Decisão antiga e conexões:** [D0038] reúne receita mensal; [D0009] e [D0041] tratam comissões; Q19 e Q34 introduzem separação explícita e parciais.

**Contraponto perguntado:** valores vendidos, recebidos, devolvidos e devidos não equivalem a caixa disponível nem lucro.

**Decisão escolhida — aceita:** mostrar separadamente recebidos, pendências de clientes, devoluções e comissões pagas ou pendentes; identificar se taxas dos provedores estão incluídas ou descontadas. Não chamar o resultado de lucro, pois o sistema não registra todas as despesas da barbearia.

### Q36 — Distribuição de versões por etapas

**Decisão antiga e conexões:** [D0019] prevê um push atualizando todas as barbearias e migrations por banco; [D0012] prevê replicação gradual.

**Contraponto perguntado:** atualizar todas simultaneamente amplia o impacto de erro de código ou banco.

**Decisão escolhida — aceita:** repositório único, com versões liberadas por etapas: teste, primeira barbearia e depois demais. Registrar versão de cada instalação, sem criar códigos diferentes por cliente.

### Q37 — Recuperação inclui conciliação externa

**Decisão antiga e conexões:** [D0014] exige backup e restauração; [D0008], [D0015] e [D0016] integram pagamentos, webhooks e jobs.

**Contraponto perguntado:** restaurar banco não desfaz pagamentos, cancelamentos ou mensagens posteriores ao backup; automações podem repetir efeitos ou ignorar pagamentos válidos.

**Decisão escolhida — aceita:** conciliar com provedores antes de retomar automações afetadas, reconstruir estados e impedir efeitos duplicados. Teste de recuperação deve cobrir esse cenário, além de demonstrar que o banco funciona.

### Q38 — Mudança de conta exige migração de assinaturas

**Decisão antiga e conexões:** [D0030] trata futura troca de conta Woovi como credenciais e configuração; [D0019] abstrai provedores.

**Contraponto perguntado:** não está demonstrado que autorizações e histórico migram junto com credenciais.

**Decisão escolhida — aceita:** validar procedimento suportado pelo provedor antes de mudar. Se não houver transferência, preservar acompanhamento das cobranças antigas e obter novas autorizações quando necessário, sem cobranças duplicadas nem perda de benefícios pagos. Não houve mudança da titularidade e do modelo de subconta escolhidos originalmente; mudou o tratamento da futura migração.

### Q39 — Reposição somente de benefício já pago

**Decisão antiga e conexões:** [D0026] permite reservar ciclo futuro não pago; Q22 cria crédito independente de renovar a assinatura.

**Contraponto perguntado:** cancelamento de reserva futura não paga poderia criar benefício gratuito, mesmo se o cliente cancelar a renovação.

**Decisão escolhida — aceita:** gerar reposição somente quando a reserva estiver vinculada a benefício já pago. Se depender de renovação ainda não paga, liberar reserva e previsão de uso, sem crédito independente da assinatura.

### Q40 — Cancelamento de reserva feita com reposição

**Decisão antiga e conexões:** Q22 não detalhava reutilização de crédito devolvido; [D0025] e [D0032] distinguem responsabilidade pelo cancelamento.

**Contraponto perguntado:** devolver crédito sem controlar identidade e validade pode multiplicá-lo ou permitir prorrogação indefinida pelo cliente.

**Decisão escolhida — aceita:** cliente que cancela dentro do prazo recupera o mesmo crédito com validade original. Cancelamento tardio ou falta consome o crédito. Se a barbearia cancelar, devolver o mesmo crédito com 30 dias reiniciados a partir do novo cancelamento. Sem duplicação.

### Q41 — Troca de recorrência programada para renovação

**Decisão antiga e conexões:** [D0050] cancela autorização antiga após confirmação da nova; [D0039] muda plano só no ciclo seguinte; [D0042] também requer coordenação de reajuste.

**Contraponto perguntado:** confirmar autorização antecipadamente não define quando cobrar; cancelar ou iniciar recorrências sem coordenar a renovação pode gerar lacuna ou duplicidade.

**Decisão escolhida — aceita:** substituição programada para próxima renovação, preservando ciclo atual. Definir uma única recorrência responsável pela cobrança seguinte e impedir duas cobranças pelo mesmo ciclo. Só apresentar troca como pronta após confirmação da programação pelo provedor. Falha fica como pendência visível, sem sucesso indevido.

### Q42 — Jornada e duração não alteram reservas silenciosamente

**Decisão antiga e conexões:** [D0032] permite editar jornada; [D0033] permite editar duração.

**Contraponto perguntado:** alterações podem deixar reservas fora do expediente ou aparentemente sobrepostas.

**Decisão escolhida — aceita:** preservar horário e duração de reservas confirmadas. Nova duração vale para novas reservas. Ao editar jornada ou intervalos, mostrar conflitos e exigir escolha do admin entre manter atendimentos como exceção ou transferir/cancelar explicitamente, com avisos e direitos aplicáveis. Q51 condiciona transferência de profissional à concordância.

### Q43 — Preço avulso preservado na reserva

**Decisão antiga e conexões:** [D0027] mostra preço antes da confirmação; [D0023] usa valores e percentuais vigentes no atendimento.

**Contraponto perguntado:** reajuste entre reserva e atendimento pode contradizer o preço aceito e deixar incerta a base de comissão.

**Decisão escolhida — aceita:** preservar preço confirmado dos serviços avulsos da reserva e usá-lo como base da comissão, com percentual vigente na data do atendimento. Mudanças de preço valem para novas reservas. Aplica-se também à parte avulsa de visita mista. A resposta não definiu um fluxo detalhado para inclusão posterior de serviços.

### Q44 — Valor de referência coberto preservado na reserva

**Decisão antiga e conexões:** [D0023] usa valor cheio do serviço no atendimento; Q43 resolveu apenas avulsos.

**Contraponto perguntado:** reajuste de referência entre reserva e atendimento também altera comissão da parte coberta, embora o cliente não pague avulso.

**Decisão escolhida — aceita:** preservar valor de referência da parte coberta no momento da reserva e aplicar percentual vigente na data do atendimento. Não é o percentual da data em que o atendente eventualmente confirma o registro com atraso.

### Q45 — Suspensão somente após terminar cobertura paga

**Decisão antiga e conexões:** [D0018] suspende na primeira recusa de cartão, sem distinguir tentativa da próxima cobrança e validade do ciclo já pago.

**Contraponto perguntado:** recusa antecipada não deve retirar período já pago.

**Decisão escolhida — aceita:** preservar benefícios até o fim do período efetivamente pago. Recusa pode gerar aviso e pendência antes disso; suspender somente quando a cobertura terminar sem novo pagamento aprovado. Não acrescenta carência gratuita.

### Q46 — Manter reservas durante suspensão, sem novo prazo configurável

**Decisão antiga e conexões:** [D0018] cancela automaticamente reservas duas horas antes quando não regularizadas; Q26 e Q27 alteram prazos de cancelamento.

**Contraponto perguntado:** prazo de regularização e prazo de perda de uso têm finalidades diferentes. Foi proposta configuração independente para liberação automática por inadimplência.

**Decisão escolhida — simplificação alternativa:** manter reserva e oferecer regularização, avulso mediante aceite ou cancelamento sem penalidade, como Q04. Não criar novo controle de prazo para admin. O resultado consolidado retira o cancelamento automático da reserva por inadimplência. O limite de reservas e o encerramento da assinatura não devem ser confundidos com aceite de cobrança avulsa.

### Q47 — Falta durante suspensão sem ciclo pago

**Decisão antiga e conexões:** [D0018], [D0025] e [D0029], com Q46, passam a manter reserva sem presumir contratação avulsa.

**Contraponto perguntado:** cliente pode não escolher opção nem comparecer; não há pagamento de ciclo nem aceite de avulso para sustentar penalidade financeira ou consumo futuro.

**Decisão escolhida — aceita:** registrar falta sem cobrança e sem consumir usos de ciclo não pago. Manter histórico e sinalização ao admin. Regularização posterior concede usos integrais do novo ciclo, sem desconto retroativo pela ausência. Crédito de reposição já pago é situação distinta, regida por Q40.

### Q48 — Reserva temporária de vaga na contratação e exceção de concorrência

**Decisão antiga e conexões:** [D0020] permite contratar; Q13 e Q14 criam teto e ocupação.

**Contraponto perguntado:** duas pessoas podem pagar pela última vaga, ou uma contratação abandonada pode bloqueá-la. Foi proposta reserva temporária e devolução se a aprovação tardia encontrasse o teto preenchido.

**Decisão escolhida — aceita com exceção em vez de devolução:** reservar vaga temporariamente ao iniciar pagamento, com prazo informado e liberação automática se não concluir. Aprovação após expiração exige nova conferência de capacidade. Havendo vaga, ativar. Se a vaga tiver sido preenchida no intervalo concorrente e o pagamento for aprovado, ativar excepcionalmente uma assinatura além do teto. A exceção está limitada a esse caso, não autoriza ignorar o teto em contratações comuns nem em toda aprovação tardia por qualquer motivo. O excedente conta na ocupação e bloqueia novas contratações enquanto não surgir capacidade. O prazo exato da reserva não foi definido.

### Q49 — Teto compartilhado entre versões do plano

**Decisão antiga e conexões:** [D0022], Q13 e Q18 combinam planos configuráveis, teto e versões preservadas.

**Contraponto perguntado:** criar nova versão não pode duplicar automaticamente a capacidade comercializada.

**Decisão escolhida — aceita:** teto pertence ao plano e conta assinaturas de todas as suas versões juntas.

### Q50 — Pagamento posteriormente revertido ou contestado

**Decisão antiga e conexões:** [D0018] trata falha de renovação; [D0025] e [D0029] permitem benefícios e comissões após aprovação, sem descrever reversão posterior.

**Contraponto perguntado:** pagamento pode deixar de sustentar benefícios depois que serviços já foram realizados; não se deve apagar histórico nem converter automaticamente serviços passados em dívida avulsa.

**Decisão escolhida — aceita:** quando o provedor confirmar reversão, reavaliar cobertura. Sem outro pagamento válido sustentando o ciclo, suspender benefícios restantes e sinalizar admin. Reservas seguem regularização, avulso com aceite ou cancelamento sem penalidade. Atendimentos realizados mantêm histórico, sem cobrança avulsa retroativa nem retirada automática de comissão. Ajustes dependem de análise do admin, motivo e histórico. Contestação ainda em análise gera pendência, sem equivaler automaticamente a reversão definitiva.

### Q51 — Transferência de barbeiro exige concordância

**Decisão antiga e conexões:** [D0032] permite transferência pelo admin com aviso; Q28 reforça escolha do profissional; Q42 exige tratar conflitos de agenda.

**Contraponto perguntado:** notificar substituição de profissional não equivale a obter concordância, especialmente perto do atendimento.

**Decisão escolhida — aceita:** transferência feita pela barbearia exige concordância do cliente, registrável pela equipe quando obtida no balcão ou por outro canal. Recusa permite cancelamento sem penalidade, tratado como cancelamento pela barbearia, com reposição quando houver benefício pago. Enviar notificação não significa aceite.

## Conexões que devem ser preservadas na validação

Estas conexões apenas consolidam escolhas acima; não acrescentam aprovações.

| Relação | Resultado consolidado | Perguntas |
|---|---|---|
| Pagamento e ciclo | Uma quitação por obrigação; regularização tardia inicia novo ciclo e muda cobrança futura; aprovação vale pelo instante do provedor, sem retroatividade. Uma aprovação duplicada não pode ser reinterpretada como nova mensalidade apenas porque o ciclo mudou. | Q01, Q02, Q05 |
| Cobertura paga e suspensão | Preservar período já pago; sem cobertura, manter reserva e solicitar regularização, aceite avulso ou cancelamento sem penalidade. Não há liberação automática do horário por inadimplência no resultado desta revisão. | Q04, Q45–Q47 |
| Reserva e uso | Reserva indisponibiliza saldo; prazo compromete o mesmo uso; desfecho não desconta novamente. Cancelamento tardio libera horário, mas não o uso, salvo exceção aprovada sem penalidade. | Q03, Q25–Q27 |
| Reposição e assinatura | Reposição vem de benefício já pago, conserva condições originais e vale sem renovação. É uma exceção expressa à necessidade de assinatura ativa para um atendimento coberto. Não deve ser confundida com uma mensalidade nova. | Q22, Q39, Q40 |
| Reposição e exclusão | Conta solicitada para exclusão permanece até usar ou vencer a reposição e resolver pendências dependentes da identificação; renovação continua interrompida. | Q10, Q23 |
| Limites diferentes | Saldo de usos, limite de reservas de plano, limite geral de reservas do cliente e teto de assinaturas do plano são controles distintos. Extra não aumenta limite; equipe tem exceção justificada ao limite geral. | Q13–Q16 |
| Teto e versões | Suspensos em retentativa e cancelados com ciclo ainda válido ocupam vaga; versões compartilham teto; pagamento concorrente pode gerar excedente excepcional. | Q14, Q18, Q48, Q49 |
| Consentimento | Notificação não equivale a aceite de cobrança avulsa, migração de benefícios ou troca de profissional. | Q04, Q17, Q18, Q51 |
| Valores e comissão | Preservar preço avulso e referência coberta na reserva; percentual é o vigente na data do atendimento. Realizado gera comissão, mesmo com avulso pendente. Parte coberta não gera segunda receita. | Q19, Q43, Q44 |
| Histórico financeiro | Correções não apagam lançamentos; ajustes vão ao período aberto; repasses parciais têm saldo; reversão de pagamento não estorna comissão automaticamente. | Q20, Q33–Q35, Q50 |
| Gestão e notificações | Cada perfil tem notificações persistentes; abrir não resolve pendência. Admin vê resumo mobile, mas exerce gestão sensível no desktop. Push para clientes não foi aprovado por criar essa área. | Q08, Q30, Q31 |
| Cancelamento e recorrência | Pedido tem horário, protocolo e processamento pendente; cobrança de ciclo iniciado depois do pedido é devolvida. Troca de recorrência exige programação confirmada, sem duas cobranças pelo ciclo. | Q09, Q41 |
| Recuperação operacional | Distribuir versões por etapas, conciliar após restauração e planejar migração de conta de pagamentos. Abstração de provedor não transfere automaticamente autorizações existentes. | Q36–Q38 |

## Cobertura dos 51 documentos originais

Cada registro foi considerado, inclusive quando já substituído. Ausência de contraponto específico significa que não houve motivo suficiente para propor mudança naquela escolha; não representa nova aprovação técnica nem teste de implementação.

| Documento original | Resultado da revisão / conexões |
|---|---|
| [D0001] — Web mobile-first | Formato web/PWA preservado; respeitadas mudanças anteriores de desktop. Navegação e acesso revisados em Q29–Q31. |
| [D0002] — Perfis | Três perfis e papéis combinados preservados; permissões, proteção e notificações em Q08, Q30, Q31. |
| [D0003] — Escopo por perfil | Lido conforme substituições já registradas. Confirmação, pagamento, correção e gestão em Q19, Q20, Q30. |
| [D0004] — Recorrência cartão/Pix | Meios preservados. Quitação, ciclo, cancelamento e coordenação em Q01, Q02, Q09, Q41. |
| [D0005] — Debater antes de construir | Preservada. Esta entrega registra análise e escolhas; não implementa o aplicativo. |
| [D0006] — Monolito TypeScript | Escolha preservada; lida junto ao worker separado de D0016. Distribuição e recuperação em Q36, Q37. |
| [D0007] — R2 | Escolha preservada, sem contraponto que justificasse trocar armazenamento. Exclusão da conta precisa ser efetivada conforme Q10 e Q23, sem presumir que apenas uma tabela contém dados pessoais. |
| [D0008] — Provedores | Escolhas preservadas; duplicidade, migração e recorrência em Q01, Q38, Q41, Q50. |
| [D0009] — Repasse manual | Preservado; correções, parcelas e apresentação financeira em Q20, Q34, Q35. |
| [D0010] — WhatsMiau | Provedor e risco aceito preservados; alcance de SAIR e notificações em Q06, Q11, Q31, Q32. |
| [D0011] — Cancelamento | Revisto funcionalmente por Q03, Q25–Q27: cancelamento tardio existe, mas pode consumir uso. |
| [D0012] — Uma loja e replicação | Estratégia preservada, com distribuição gradual de versões em Q36. |
| [D0013] — Piloto fechado/sem avulso no app | Substituições por D0020 e D0029 respeitadas; não reaberta como regra vigente. |
| [D0014] — Railway | Hospedagem preservada; teste de recuperação ampliado em Q37. |
| [D0015] — Stack e segurança | Stack preservada; identidade, proteção e conciliação conectadas em Q07, Q08, Q37. Não foram revalidadas APIs de bibliotecas. |
| [D0016] — pg-boss | Fila preservada; reconstrução e prevenção de efeitos repetidos em Q37. |
| [D0017] — Login | Esclarecido em Q06; identidade e proteção revisadas em Q07 e Q08. |
| [D0018] — Inadimplência | Revisão central: Q01–Q05, Q14, Q45–Q47, Q50. Reserva deixa de ser cancelada automaticamente por suspensão. |
| [D0019] — Replicação/configuração | Código único e isolamento preservados; atualização simultânea substituída por etapas em Q36. Migração de pagamentos em Q38. |
| [D0020] — Cadastro aberto | Abertura preservada, sujeita a teto comercial e limites de reservas em Q13–Q16, Q48, Q49. |
| [D0021] — Autocancelamento | Preservado e refinado por Q09, Q10, Q14, Q23. |
| [D0022] — Planos | Nomes, preços e quatro usos originais não foram alterados nesta revisão. Simulador rejeitado em Q12; teto e versões em Q13, Q18, Q49. |
| [D0023] — Comissão | Fórmula sob controle do admin preservada. Separação de pagamento, correção e bases históricas em Q19, Q20, Q43, Q44, Q50. |
| [D0024] — Falta sem consumo | Substituição por D0025 respeitada. Sinalização mantida; novo caso sem ciclo pago em Q47 não restaura a regra antiga para assinante coberto. |
| [D0025] — Ciclo e usos | Refinada por Q01–Q05, Q15, Q22, Q25–Q27, Q39, Q40. |
| [D0026] — Reservas futuras | Mantida, conectada a ciclo recalculado, limites separados e benefício ainda não pago: Q02, Q15, Q16, Q17, Q39. |
| [D0027] — Cobertura e avulso | Aceite, combo, recebimento e preço preservado em Q04, Q17, Q19, Q21, Q43. |
| [D0028] — Avulso no app | Substituída por D0029; não foi reintroduzido pagamento avulso nos gateways. |
| [D0029] — Avulso presencial e confirmação | Preservado presencial; estados, correções e finanças refinados em Q03, Q19, Q20, Q35, Q47. |
| [D0030] — Contas por fase | Titularidade e subconta preservadas; promessa de troca apenas por configuração contestada e revista em Q38. |
| [D0031] — Número único no piloto | Estratégia preservada com limitação de recuperação explícita em Q06. |
| [D0032] — Jornada e bloqueios | Autonomia mantida em Q24; reposição, conflitos e transferências em Q22, Q39, Q40, Q42, Q51. |
| [D0033] — Duração e grade | Grade e duração igual por serviço preservadas; combinação e reservas existentes em Q21, Q42. |
| [D0034] — Marcação pela equipe | Preservada; identidade e exceção ao limite geral em Q07 e Q16. Não foi aprovada conta de cliente sem WhatsApp. |
| [D0035] — Antecedência mínima | Desacoplada do prazo de perda de uso em Q26; preservação da condição em Q27. |
| [D0036] — Horário antes do barbeiro | Padrão preservado, com filtro opcional aprovado em Q28. |
| [D0037] — Habilitação | Regra de profissional habilitado para todos os serviços preservada; combo e filtro em Q21, Q28. |
| [D0038] — Painel do admin | Separação financeira, pendências e superfícies em Q30, Q31, Q35. |
| [D0039] — Troca no próximo ciclo | Preservada, com aceite das reservas afetadas e programação de recorrência em Q17, Q41. |
| [D0040] — Ações administrativas | Cortesia separada de limite e correção de erro; gestão desktop: Q15, Q20, Q30. |
| [D0041] — Fechamento mensal | Imutabilidade preservada, ajustes no período aberto e pagamentos parciais em Q33, Q34. |
| [D0042] — Reajuste | Regra de 30 dias preservada para preço; distinta de migração de benefícios em Q18. |
| [D0043] — Exploração sem login | Substituição por D0048 respeitada. Q29 reabre apenas informações de serviços e barbeiros, não disponibilidade. |
| [D0044] — Push equipe/WhatsApp cliente | Canais preservados; área persistente por perfil em Q31. |
| [D0045] — Lembretes | Horários de envio preservados, conteúdo e estado conferidos no envio em Q32. |
| [D0046] — Aceite, opt-out e exclusão | Comportamentos revistos em Q10, Q11, Q23; não houve validação jurídica de retenção ou anonimização. |
| [D0047] — Mobile/desktop | Gestão sensível desktop reafirmada em Q30; notificações em Q31; exceções de agenda existentes preservadas. |
| [D0048] — Conteúdo público | Ajustado em Q29: planos, benefícios, serviços e barbeiros públicos; agenda e contratação autenticadas. |
| [D0049] — Combo parcial | Regra preservada e normalização de seleção aprovada em Q21; bases em Q43 e Q44. |
| [D0050] — Pix sem autorização nova | Regras de troca não efetivada e reajuste preservadas, com aceite de cobertura e coordenação de recorrência em Q17, Q41. |
| [D0051] — Pré-cadastrado | Limitação a comunicação do atendimento preservada; SAIR refinado em Q11 e identidade em Q07. |

## Validações e detalhes não decididos

Esta seção não acrescenta regras de produto. Se a validação exigir uma nova escolha de negócio, ela deve voltar ao dono do produto, sem ser tratada como aprovação implícita deste arquivo.

- **Provedores:** confirmar mecanismos efetivos de alterar vencimento após atraso, coordenar recorrências, consultar aprovações históricas, devolver duplicidades e migrar contas. A conversa decidiu o comportamento desejado; não demonstrou sua execução nas APIs atuais nem alterou provedores.
- **Calendário:** documentar como o mês de assinatura trata dias sem correspondência no mês seguinte e qual fuso governa limites. Não substituir mês por 30 dias silenciosamente. O crédito de reposição, diferentemente do ciclo mensal, foi definido expressamente em 30 dias.
- **Identidade:** detalhar a conferência assistida e a proteção contra número reutilizado, inclusive no pré-cadastro e login por código. Um identificador interno permanente, sozinho, não elimina o risco de reconhecer pessoa diferente pelo mesmo número.
- **Parâmetros técnicos:** prazo de reserva temporária da vaga, janela de autenticação recente e estratégia de tentativas/escalonamento não receberam valores nesta conversa.
- **Concorrência:** verificar simultaneidade de reserva de horário, consumo de uso, reserva de vaga e confirmação de pagamento. A exceção comercial de Q48 é somente para a vaga de assinatura no caso aprovado; não autoriza dois atendimentos conflitantes na mesma agenda.
- **Recalcular sem cobrar silenciosamente:** testar reservas futuras quando Q02 deslocar o ciclo, quando Q17 mudar cobertura e quando Q41 falhar. Preservar condições confirmadas, limites e exigências de aceite. Se os cenários exigirem regra de prioridade entre reservas, essa escolha ainda deverá ser apresentada ao dono do produto.
- **Modelo operacional:** harmonizar a descrição de mesmo deploy em D0006 com o worker separado já previsto em D0016. Não foi escolhida nova arquitetura de execução nesta revisão.
- **Versionamento e catálogos:** confirmar que há uma combinação inequívoca para aplicar combo equivalente e que habilitações de combo/componentes permanecem coerentes. A conversa não definiu desempate para múltiplos combos idênticos nem inclusão posterior de itens no atendimento.
- **Privacidade e exclusão:** validar o procedimento e os prazos aplicáveis aos dados pessoais, arquivos e registros financeiros. Este documento registra escolhas funcionais de encerramento e comunicação; não atesta conformidade legal.
- **Riscos expressamente mantidos:** WhatsApp obrigatório, ausência de canal independente para contas sem Google vinculado, provedor não oficial no piloto, ausência de simulação de margem e autonomia de bloqueio do barbeiro não foram eliminados pela revisão.

## Referências aos documentos preservados

[D0001]: 0001-produto-web-mobile-first-estilo-app.md
[D0002]: 0002-tres-perfis-de-usuario.md
[D0003]: 0003-escopo-funcional-por-perfil.md
[D0004]: 0004-assinatura-recorrente-cartao-e-pix.md
[D0005]: 0005-processo-debate-antes-de-construir.md
[D0006]: 0006-monolito-typescript-tailwind-postgres.md
[D0007]: 0007-storage-cloudflare-r2.md
[D0008]: 0008-pagamentos-mercado-pago-cartao-woovi-pix.md
[D0009]: 0009-repasse-manual-aos-barbeiros.md
[D0010]: 0010-whatsapp-via-whatsmiau.md
[D0011]: 0011-cancelamento-ate-2h-antes.md
[D0012]: 0012-uma-barbearia-agora-replicar-depois.md
[D0013]: 0013-sem-avulso-assinatura-para-clientes-escolhidos.md
[D0014]: 0014-hospedagem-railway.md
[D0015]: 0015-tanstack-start-better-auth-drizzle.md
[D0016]: 0016-fila-de-jobs-pg-boss.md
[D0017]: 0017-login-whatsapp-otp-e-google.md
[D0018]: 0018-inadimplencia-suspende-e-reativa.md
[D0019]: 0019-um-codigo-varios-deploys-barbearia-id.md
[D0020]: 0020-cadastro-aberto-admin-gerencia-no-backoffice.md
[D0021]: 0021-cliente-cancela-assinatura-sozinho.md
[D0022]: 0022-planos-barbearia-do-moura.md
[D0023]: 0023-comissao-por-barbeiro-e-servico.md
[D0024]: 0024-falta-nao-consome-uso-e-sinaliza-admin.md
[D0025]: 0025-uso-do-plano-ciclo-e-consumo.md
[D0026]: 0026-horarios-futuros-do-assinante.md
[D0027]: 0027-cobertura-do-plano-e-parte-avulsa.md
[D0028]: 0028-pagamento-avulso-no-app.md
[D0029]: 0029-avulso-presencial-e-confirmacao-de-atendimento.md
[D0030]: 0030-contas-dos-provedores-de-pagamento-por-fase.md
[D0031]: 0031-whatsmiau-planos-e-numeros-por-fase.md
[D0032]: 0032-jornada-pelo-admin-bloqueio-pelo-barbeiro.md
[D0033]: 0033-duracao-dos-servicos-e-grade-30-min.md
[D0034]: 0034-agendamento-feito-pela-barbearia.md
[D0035]: 0035-antecedencia-minima-2h.md
[D0036]: 0036-fluxo-de-marcacao-horario-primeiro.md
[D0037]: 0037-plano-vale-com-qualquer-barbeiro-e-habilitacao-por-servico.md
[D0038]: 0038-painel-inicial-do-admin.md
[D0039]: 0039-troca-de-plano-no-proximo-ciclo.md
[D0040]: 0040-acoes-do-admin-sobre-assinaturas.md
[D0041]: 0041-fechamento-mensal-de-comissoes.md
[D0042]: 0042-reajuste-de-plano-para-todos-com-30-dias.md
[D0043]: 0043-onboarding-boas-vindas-e-explorar-sem-login.md
[D0044]: 0044-push-para-equipe-whatsapp-para-clientes.md
[D0045]: 0045-lembretes-24h-e-3h-antes.md
[D0046]: 0046-lgpd-aceite-opt-out-e-exclusao.md
[D0047]: 0047-app-mobile-e-backoffice-desktop.md
[D0048]: 0048-onboarding-planos-sem-login-resto-com-login.md
[D0049]: 0049-combo-dividido-em-componentes.md
[D0050]: 0050-pix-sem-nova-autorizacao.md
[D0051]: 0051-mensagens-para-cliente-pre-cadastrado.md
