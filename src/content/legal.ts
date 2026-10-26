export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

/**
 * Versão dos Termos de Uso e da Política de Privacidade. Ao mudar, quem já
 * aceitou uma versão anterior precisa aceitar de novo (tela /aceite).
 */
export const TERMS_VERSION = "2026-10-26";
export const LEGAL_UPDATED_AT = "26/10/2026";

/** Dados do controlador. */
const CONTROLLER = {
  name: "Barbearia do Moura",
  cnpj: "63.940.273/0001-36",
  address: "Mauá/SP",
  dpoEmail: "marciopetigrosso@gmail.com",
};

const CONTACT = `pelo WhatsApp oficial da barbearia, pelo e-mail ${CONTROLLER.dpoEmail} ou presencialmente na barbearia, em ${CONTROLLER.address}`;

export const TERMS: LegalSection[] = [
  {
    id: "aceite",
    title: "1. Aceite e definições",
    paragraphs: [
      `Estes Termos de Uso regulam o uso do site e do aplicativo da ${CONTROLLER.name} (CNPJ ${CONTROLLER.cnpj}), doravante "Barbearia", por você, doravante "Cliente". Ao criar sua conta e marcar "Li e aceito", você declara que leu e concorda com estes Termos e com a Política de Privacidade.`,
      "Se você não concordar, não utilize o serviço. Para usar o app é preciso ter pelo menos 18 anos ou estar autorizado pelo responsável legal.",
    ],
    bullets: [
      "Plataforma: o site e o aplicativo web da Barbearia, onde se agenda, paga e assina.",
      "Agendamento: reserva de um serviço com um barbeiro em data e horário definidos.",
      "Clube Moura: assinatura mensal com atendimentos incluídos, conforme o plano escolhido.",
      "Ciclo: período mensal de vigência da assinatura, contado a partir da data de contratação ou da última renovação.",
    ],
  },
  {
    id: "conta",
    title: "2. Conta e acesso",
    paragraphs: [
      "O acesso é feito sem senha: você informa seu WhatsApp e recebe um código de 6 dígitos válido por 5 minutos, ou entra com sua conta Google. É obrigatório informar nome e confirmar um número de WhatsApp válido.",
      "A conta é pessoal e intransferível. Você é responsável pela veracidade dos dados e por manter o acesso ao seu WhatsApp e à sua conta Google em segurança.",
    ],
    bullets: [
      "Nunca compartilhe os códigos de acesso. A Barbearia nunca pede o código por ligação ou mensagem.",
      "Avise a Barbearia imediatamente se suspeitar de uso indevido da sua conta.",
    ],
  },
  {
    id: "agendamentos",
    title: "3. Agendamentos, cancelamento e faltas",
    paragraphs: [
      "Os horários disponíveis dependem da escala de cada barbeiro, do funcionamento da Barbearia e de feriados. O agendamento é confirmado quando aparece em \"Meus agendamentos\".",
      "Você pode cancelar pelo app até o prazo de antecedência exibido na confirmação (definido pela Barbearia e informado antes de confirmar). Depois desse prazo, o cancelamento deve ser combinado diretamente com a Barbearia.",
      "Tolerância e faltas: atrasos podem reduzir o tempo do atendimento ou exigir remarcação. O não comparecimento sem cancelamento é registrado como falta; para assinantes do Clube, a falta consome um atendimento do ciclo.",
      "A Barbearia pode remarcar ou cancelar um horário por motivo operacional (ex.: ausência do barbeiro), avisando pelo WhatsApp. Se o horário estiver pago, você escolhe entre remarcar ou receber o reembolso.",
    ],
  },
  {
    id: "pagamentos",
    title: "4. Pagamentos avulsos",
    paragraphs: [
      "No agendamento você escolhe pagar na Barbearia (dinheiro, cartão ou Pix no balcão) ou pagar na hora pelo app com Pix (QR Code dinâmico). Os pagamentos online são processados pelo AbacatePay, intermediador de pagamentos; a Barbearia não recebe nem armazena dados de cartão.",
      "O Pix gerado pelo app tem validade limitada. Se expirar sem pagamento, o horário continua marcado e pode ser pago na Barbearia.",
      "Cancelamentos feitos dentro do prazo dão direito ao reembolso integral do valor pago online, pelo mesmo meio de pagamento.",
    ],
  },
  {
    id: "clube",
    title: "5. Clube Moura: planos e regras de uso",
    paragraphs: [
      "O Clube Moura é uma assinatura mensal com renovação automática. Os planos disponíveis são:",
    ],
    bullets: [
      "Black — R$ 129,90/mês: somente corte de cabelo, em qualquer dia da semana, até 4 atendimentos por ciclo.",
      "Gold Limitado — R$ 179,90/mês: corte e barba (corte, barba ou corte + barba), somente às terças e quartas-feiras, até 4 atendimentos por ciclo.",
      "Premium — R$ 199,90/mês: corte e barba (corte, barba ou corte + barba), em qualquer dia da semana, até 4 atendimentos por ciclo.",
      "Cada agendamento coberto conta como 1 atendimento, inclusive o combo corte + barba.",
      "Atendimentos não utilizados no ciclo não acumulam para o ciclo seguinte e não são convertidos em dinheiro.",
      "Cancelar um agendamento dentro do prazo devolve o atendimento ao ciclo; a falta consome o atendimento.",
      "Serviços fora do plano, ou fora dos dias cobertos, são cobrados normalmente pelo preço de tabela.",
      "Os benefícios são pessoais e intransferíveis e valem apenas para o titular da conta.",
    ],
  },
  {
    id: "cobranca",
    title: "6. Cobrança, renovação e cancelamento da assinatura",
    paragraphs: [
      "A assinatura é cobrada antecipadamente a cada ciclo, no cartão de crédito ou pelo Pix Automático, por meio do checkout do AbacatePay, e renova automaticamente até ser cancelada. Assinaturas também podem ser pagas no balcão, com validade de um ciclo.",
      "Você pode cancelar a qualquer momento em Clube > Cancelar assinatura. O cancelamento interrompe as próximas cobranças imediatamente, nos termos do processamento do AbacatePay; valores de ciclos já pagos não são reembolsados proporcionalmente, salvo no direito de arrependimento abaixo.",
      "Se uma cobrança recorrente falhar, o AbacatePay fará novas tentativas; persistindo a falha, a assinatura é cancelada e os benefícios deixam de valer.",
      "Reajustes de preço serão comunicados com pelo menos 30 dias de antecedência e valerão a partir do ciclo seguinte; você pode cancelar antes do reajuste sem custo.",
    ],
  },
  {
    id: "arrependimento",
    title: "7. Direito de arrependimento",
    paragraphs: [
      "Conforme o art. 49 do Código de Defesa do Consumidor, você pode desistir da assinatura em até 7 dias corridos da contratação online. Se nenhum atendimento do Clube tiver sido usado, o valor pago é reembolsado integralmente; se houver uso, é descontado o valor de tabela dos serviços utilizados.",
      "Para exercer o arrependimento, cancele a assinatura pelo app e avise a Barbearia pelo WhatsApp informando que deseja o reembolso.",
    ],
  },
  {
    id: "estornos",
    title: "8. Contestações (chargeback)",
    paragraphs: [
      "Antes de contestar uma cobrança junto ao banco ou ao emissor do cartão, fale com a Barbearia para resolvermos rapidamente. Contestações indevidas de serviços efetivamente prestados podem levar à suspensão da assinatura e da conta até a regularização.",
    ],
  },
  {
    id: "comunicacoes",
    title: "9. Comunicações pelo WhatsApp",
    paragraphs: [
      "A Barbearia usa o WhatsApp para enviar códigos de acesso, confirmações e lembretes dos seus horários. Os lembretes podem ser desligados a qualquer momento em Perfil > Lembretes no WhatsApp; os códigos de acesso são enviados sempre que você pede para entrar.",
    ],
  },
  {
    id: "conduta",
    title: "10. Conduta e uso indevido",
    paragraphs: [
      "É proibido usar a plataforma para fraude, agendamentos falsos ou em massa, tentativa de invasão, engenharia reversa, coleta automatizada de dados ou qualquer ação que comprometa o serviço ou outros clientes.",
      "A Barbearia pode suspender ou encerrar contas que violem estes Termos, com aviso prévio sempre que possível.",
    ],
  },
  {
    id: "responsabilidade",
    title: "11. Disponibilidade e responsabilidade",
    paragraphs: [
      "A plataforma é oferecida como está e pode passar por manutenções ou instabilidades, inclusive de fornecedores (hospedagem, WhatsApp e pagamentos). Nesses casos, você pode agendar ou pagar diretamente na Barbearia.",
      "A Barbearia responde pelos serviços prestados nos termos do Código de Defesa do Consumidor e não se responsabiliza por danos decorrentes de uso indevido da conta pelo próprio cliente ou de falhas exclusivas de terceiros.",
    ],
  },
  {
    id: "propriedade",
    title: "12. Propriedade intelectual",
    paragraphs: [
      "Marca, identidade visual, textos, imagens e o software da plataforma pertencem à Barbearia ou a seus licenciantes. É proibida a reprodução ou o uso comercial sem autorização por escrito.",
    ],
  },
  {
    id: "alteracoes",
    title: "13. Alterações destes Termos",
    paragraphs: [
      "Estes Termos podem ser atualizados. Mudanças relevantes serão avisadas no app e, quando exigirem novo aceite, você será convidado a aceitar a nova versão antes de continuar usando a plataforma. A data no topo indica a versão em vigor.",
    ],
  },
  {
    id: "foro",
    title: "14. Lei aplicável, foro e contato",
    paragraphs: [
      "Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de Mauá/SP, sem prejuízo do direito do consumidor de ajuizar ações no foro do seu domicílio.",
      `Dúvidas, reclamações e solicitações: ${CONTACT}.`,
    ],
  },
];

export const PRIVACY: LegalSection[] = [
  {
    id: "controlador",
    title: "1. Quem é o controlador",
    paragraphs: [
      `O controlador dos dados pessoais tratados na plataforma é ${CONTROLLER.name}, CNPJ ${CONTROLLER.cnpj}, com sede em ${CONTROLLER.address}.`,
      `Encarregado pelo tratamento de dados (DPO): ${CONTROLLER.dpoEmail}.`,
      "Esta Política explica quais dados pessoais tratamos, por quê, com quem compartilhamos e como você exerce seus direitos, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).",
    ],
  },
  {
    id: "dados",
    title: "2. Dados que tratamos",
    paragraphs: ["Tratamos apenas os dados necessários para o funcionamento do serviço:"],
    bullets: [
      "Cadastro: nome, número de WhatsApp e, se entrar com o Google, nome, e-mail e foto da conta Google.",
      "Uso do serviço: agendamentos, serviços realizados, barbeiro escolhido, faltas, avaliações e comentários que você escrever.",
      "Pagamentos e assinatura: plano contratado, status, datas de cobrança e valores. Dados de cartão são tratados exclusivamente pelo AbacatePay e não chegam aos nossos servidores.",
      "Técnicos: data e hora de acesso, endereço IP e navegador, para manter a sessão, prevenir abusos e diagnosticar falhas.",
      "Equipe (barbeiros e gestão): foto de perfil, escala de trabalho e comissões.",
    ],
  },
  {
    id: "finalidades",
    title: "3. Finalidades e bases legais",
    paragraphs: ["Cada uso tem uma base legal prevista no art. 7º da LGPD:"],
    bullets: [
      "Criar e proteger sua conta, agendar, prestar os serviços e gerir sua assinatura — execução de contrato (art. 7º, V).",
      "Processar pagamentos, emitir comprovantes e cumprir obrigações fiscais e contábeis — cumprimento de obrigação legal (art. 7º, II) e execução de contrato.",
      "Lembretes de horário pelo WhatsApp — execução de contrato, com opção de desligar a qualquer momento.",
      "Prevenção a fraudes, segurança da conta e registros de acesso — legítimo interesse (art. 7º, IX) e Marco Civil da Internet.",
      "Avaliações para melhorar o atendimento e calcular indicadores da equipe — legítimo interesse.",
      "Login com Google — consentimento (art. 7º, I), revogável a qualquer momento.",
    ],
  },
  {
    id: "compartilhamento",
    title: "4. Operadores e compartilhamento",
    paragraphs: [
      "Não vendemos dados pessoais. Compartilhamos apenas com operadores que tratam dados em nosso nome, sob contrato e com medidas de segurança:",
    ],
    bullets: [
      "Cloudflare, Inc. — hospedagem da plataforma, banco de dados (D1) e armazenamento de imagens (R2).",
      "WhatsMiau — envio de mensagens pelo WhatsApp da Barbearia (códigos de acesso e lembretes).",
      "AbacatePay — processamento de pagamentos via Pix e cartão e das assinaturas recorrentes.",
      "Google LLC — autenticação, somente se você escolher entrar com a conta Google.",
      "Autoridades públicas — quando houver obrigação legal ou ordem judicial.",
    ],
  },
  {
    id: "transferencia",
    title: "5. Transferência internacional",
    paragraphs: [
      "Alguns operadores (como Cloudflare e Google) podem processar dados fora do Brasil. Essas transferências seguem o art. 33 da LGPD, com garantias contratuais e padrões de segurança compatíveis com a lei brasileira.",
    ],
  },
  {
    id: "retencao",
    title: "6. Por quanto tempo guardamos",
    bullets: [
      "Dados da conta: enquanto a conta estiver ativa.",
      "Registros de pagamentos e documentos fiscais: pelo prazo legal (em geral, 5 anos).",
      "Registros de acesso: 6 meses, conforme o Marco Civil da Internet (Lei nº 12.965/2014).",
      "Códigos de acesso: expiram em 5 minutos e nunca são gravados no histórico de mensagens.",
      "Após a exclusão da conta, os dados pessoais são apagados ou anonimizados, mantendo apenas o necessário para obrigações legais.",
    ],
    paragraphs: [],
  },
  {
    id: "direitos",
    title: "7. Seus direitos",
    paragraphs: ["Conforme o art. 18 da LGPD, você pode, a qualquer momento:"],
    bullets: [
      "Confirmar se tratamos seus dados e acessá-los.",
      "Corrigir dados incompletos, inexatos ou desatualizados (o nome pode ser editado no Perfil).",
      "Pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.",
      "Pedir a portabilidade dos dados e informações sobre compartilhamento.",
      "Revogar consentimentos, como o login com Google, e desligar os lembretes no WhatsApp.",
      "Excluir sua conta em Perfil > Excluir minha conta: horários futuros e assinatura são cancelados e seus dados pessoais são apagados ou anonimizados.",
      "Apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).",
    ],
  },
  {
    id: "exercer",
    title: "8. Como exercer seus direitos",
    paragraphs: [
      `Use as opções do próprio app ou fale com o encarregado ${CONTACT}. Responderemos em até 15 dias, podendo pedir informações para confirmar sua identidade.`,
    ],
  },
  {
    id: "cookies",
    title: "9. Cookies",
    paragraphs: [
      "Usamos apenas cookies essenciais de sessão: para manter você conectado com segurança e lembrar o modo de uso escolhido (cliente, barbeiro ou gestão). Não usamos cookies de publicidade nem de rastreamento de terceiros.",
      "Bloquear cookies no navegador impede o login na plataforma.",
    ],
  },
  {
    id: "seguranca",
    title: "10. Segurança",
    paragraphs: [
      "Adotamos medidas técnicas e administrativas como conexões criptografadas (HTTPS), sessões protegidas, controle de acesso por perfil (cliente, barbeiro e gestão), segredos isolados no servidor e registro de operações sensíveis.",
      "Em caso de incidente de segurança que possa gerar risco relevante, comunicaremos os titulares afetados e a ANPD, conforme o art. 48 da LGPD.",
    ],
  },
  {
    id: "criancas",
    title: "11. Crianças e adolescentes",
    paragraphs: [
      "A plataforma é destinada a maiores de 18 anos. Agendamentos para menores devem ser feitos pelo responsável legal, que responde pelas informações fornecidas.",
    ],
  },
  {
    id: "atualizacoes",
    title: "12. Atualizações desta Política",
    paragraphs: [
      "Esta Política pode ser atualizada. Mudanças relevantes serão avisadas no app e, quando necessário, pediremos um novo aceite. A data no topo indica a versão em vigor.",
    ],
  },
];
