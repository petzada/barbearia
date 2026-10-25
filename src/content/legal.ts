export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const LEGAL_UPDATED_AT = "24/10/2026";

const CONTACT =
  "Atendimento presencial na Av. Queiroz Pedroso, 433 - Jd. Pedroso - Mauá/SP, pelo WhatsApp oficial da barbearia ou pelo Instagram @barbeariadomoura.";

export const TERMS: LegalSection[] = [
  {
    id: "objeto",
    title: "1. Objeto e abrangência",
    paragraphs: [
      "Estes Termos de Uso regulam o acesso e a utilização do site e do aplicativo da Barbearia do Moura para consultar serviços e horários, agendar e pagar atendimentos e assinar o Clube Moura.",
      "Ao navegar, criar conta, agendar ou assinar, você concorda com as regras desta página.",
    ],
  },
  {
    id: "acesso",
    title: "2. Cadastro e acesso",
    paragraphs: [
      "O acesso é feito sem senha: você informa seu WhatsApp e recebe um código de 6 números enviado pela barbearia, ou entra com sua conta Google. Para usar o agendamento é preciso informar seu nome e confirmar um número de WhatsApp válido.",
      "Você é responsável pelas informações do cadastro e pelas ações feitas com sua conta.",
    ],
    bullets: [
      "Não compartilhe os códigos de acesso recebidos no WhatsApp com ninguém.",
      "Mantenha seu número de WhatsApp atualizado para receber os lembretes do seu horário.",
      "Avise a barbearia se suspeitar de uso indevido da sua conta.",
    ],
  },
  {
    id: "agendamentos",
    title: "3. Agendamentos, cancelamento e faltas",
    paragraphs: [
      "Os horários exibidos dependem da agenda de cada barbeiro e podem mudar por motivos operacionais. O agendamento é confirmado assim que aparece em “Meus agendamentos”.",
      "Você pode cancelar pelo app até o prazo informado na confirmação do agendamento. Depois desse prazo, fale com a barbearia.",
      "Em caso de atraso ou não comparecimento, a barbearia pode ajustar ou registrar falta no atendimento para não prejudicar os demais clientes.",
    ],
  },
  {
    id: "pagamentos",
    title: "4. Pagamentos",
    paragraphs: [
      "No agendamento você escolhe pagar na barbearia (dinheiro, cartão ou Pix no balcão) ou pagar na hora com Pix pelo app. Os pagamentos online são processados pelo AbacatePay, intermediador de pagamentos parceiro.",
      "O Pix gerado pelo app tem validade limitada. Se expirar sem pagamento, o horário continua marcado e pode ser pago na barbearia.",
      "Estornos de pagamentos online seguem as regras do meio de pagamento utilizado e são combinados diretamente com a barbearia.",
    ],
  },
  {
    id: "clube",
    title: "5. Clube Moura (assinaturas)",
    paragraphs: [
      "Os planos do Clube Moura têm benefícios, valores e ciclos de cobrança descritos na página de cada plano. Antes de assinar, confira as condições de uso.",
      "A assinatura é cobrada de forma recorrente no cartão de crédito ou pelo Pix Automático, por meio do checkout do AbacatePay, e renova automaticamente a cada ciclo até ser cancelada.",
      "Você pode cancelar a assinatura a qualquer momento pelo app, na página Clube. O cancelamento interrompe as próximas cobranças imediatamente. Assinaturas também podem ser contratadas e pagas diretamente na barbearia.",
    ],
  },
  {
    id: "comunicacoes",
    title: "6. Comunicações pelo WhatsApp",
    paragraphs: [
      "A barbearia usa o WhatsApp para enviar códigos de acesso e lembretes do seu horário. Os lembretes podem ser desligados a qualquer momento em Perfil > Lembretes no WhatsApp; os códigos de acesso são sempre enviados quando você pede para entrar.",
    ],
  },
  {
    id: "uso-indevido",
    title: "7. Uso indevido",
    paragraphs: [
      "Não é permitido usar o site ou o app para fraude, agendamentos falsos em massa, tentativa de invasão, engenharia reversa ou qualquer ação que comprometa o serviço.",
      "A Barbearia do Moura pode suspender acessos que violem estes termos ou prejudiquem a operação.",
    ],
  },
  {
    id: "propriedade",
    title: "8. Propriedade intelectual",
    paragraphs: [
      "Marca, identidade visual, textos, imagens e demais materiais do site e do app pertencem à Barbearia do Moura ou a seus licenciantes. Não é permitida a reprodução ou o uso comercial sem autorização prévia por escrito.",
    ],
  },
  {
    id: "contato",
    title: "9. Alterações e contato",
    paragraphs: [
      "Estes termos podem ser atualizados para refletir ajustes operacionais, legais ou melhorias no serviço. A data de atualização no topo desta página indica a versão em vigor.",
      `Dúvidas sobre estes termos: ${CONTACT}`,
    ],
  },
];

export const PRIVACY: LegalSection[] = [
  {
    id: "dados",
    title: "1. Dados que coletamos",
    paragraphs: [
      "Dados que você informa: nome, número de WhatsApp e, se entrar com o Google, o nome, e-mail e foto da sua conta Google.",
      "Dados de uso do serviço: agendamentos, serviços realizados, barbeiro escolhido, avaliações que você escrever, assinaturas e histórico de pagamentos.",
      "Dados técnicos essenciais: data e hora de acesso, endereço IP e tipo de navegador, usados para manter sua sessão ativa, proteger contra abusos e diagnosticar falhas.",
      "Não recebemos nem armazenamos dados de cartão de crédito: o pagamento com cartão é feito diretamente no ambiente do AbacatePay.",
    ],
  },
  {
    id: "finalidades",
    title: "2. Para que usamos",
    paragraphs: [
      "Para criar e proteger sua conta (códigos de acesso), organizar a agenda da equipe, confirmar e lembrar seus horários, processar pagamentos e assinaturas, calcular comissões da equipe e melhorar o atendimento a partir das avaliações.",
      "Também para prevenir fraudes, dar suporte e cumprir obrigações legais e fiscais.",
    ],
  },
  {
    id: "compartilhamento",
    title: "3. Com quem compartilhamos",
    paragraphs: [
      "Compartilhamos dados apenas com fornecedores necessários para o funcionamento do serviço, que os tratam em nosso nome:",
    ],
    bullets: [
      "Cloudflare — hospedagem do site e do app e armazenamento do banco de dados (D1) e de imagens (R2).",
      "WhatsMiau — envio de mensagens pelo WhatsApp da barbearia (códigos de acesso e lembretes).",
      "AbacatePay — processamento de pagamentos via Pix e cartão e das assinaturas recorrentes.",
      "Google — somente se você escolher entrar com a sua conta Google.",
    ],
  },
  {
    id: "retencao",
    title: "4. Por quanto tempo guardamos",
    paragraphs: [
      "Mantemos os dados enquanto sua conta estiver ativa e pelo tempo necessário para cumprir obrigações legais, fiscais e de auditoria (por exemplo, registros de pagamentos).",
      "Códigos de acesso expiram em 5 minutos e não ficam registrados no histórico de mensagens.",
    ],
  },
  {
    id: "seguranca",
    title: "5. Segurança",
    paragraphs: [
      "Adotamos medidas técnicas e administrativas para reduzir o risco de acesso não autorizado, perda ou vazamento de dados, como conexões criptografadas, sessões protegidas e controle de acesso por perfil (cliente, barbeiro e gestão).",
      "Nenhum ambiente é totalmente imune a incidentes, e revisamos continuamente esses controles.",
    ],
  },
  {
    id: "direitos",
    title: "6. Seus direitos (LGPD)",
    paragraphs: [
      "Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode solicitar:",
    ],
    bullets: [
      "Confirmação de tratamento e acesso aos seus dados.",
      "Correção de dados incompletos, inexatos ou desatualizados — o nome pode ser alterado no próprio Perfil.",
      "Portabilidade, quando aplicável, e informações sobre compartilhamento.",
      "Revogação de consentimento, como desligar os lembretes no WhatsApp.",
      "Eliminação dos dados: em Perfil > Excluir minha conta, seus horários futuros e sua assinatura são cancelados e seus dados pessoais são apagados ou anonimizados, mantendo apenas o necessário para obrigações legais.",
    ],
  },
  {
    id: "cookies",
    title: "7. Cookies",
    paragraphs: [
      "Usamos apenas cookies essenciais: para manter você conectado e lembrar o modo de uso escolhido (cliente, barbeiro ou gestão). Não usamos cookies de publicidade.",
      "Bloquear cookies no navegador impede o login no app.",
    ],
  },
  {
    id: "contato",
    title: "8. Contato",
    paragraphs: [
      `Para assuntos de privacidade e exercício dos seus direitos: ${CONTACT}`,
      "Quando esta política for atualizada, a data no topo da página será alterada.",
    ],
  },
];
