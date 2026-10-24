export const WHATSAPP_TEMPLATE_VARIABLES = [
  "cliente_nome",
  "profissional_nome",
  "servico_nome",
  "data_agendamento",
  "hora_agendamento",
  "barbearia_nome",
  "telefone_barbearia",
  "endereco_barbearia",
] as const;

export const DEFAULT_WHATSAPP_TEMPLATE =
  "Olá, {{cliente_nome}}! Lembrete da {{barbearia_nome}}: seu horário é hoje, {{data_agendamento}}, às {{hora_agendamento}} com {{profissional_nome}} ({{servico_nome}}). Dúvidas: {{telefone_barbearia}}.";

export const OTP_MESSAGE = (code: string, shopName: string) =>
  `${code} é o seu código de acesso à ${shopName}. Ele expira em 5 minutos. Não compartilhe com ninguém.`;

export type WhatsappTemplateContext = Partial<Record<(typeof WHATSAPP_TEMPLATE_VARIABLES)[number], string | null | undefined>>;

const TEMPLATE_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

const sanitizeTemplateValue = (value: string | null | undefined): string =>
  value?.trim() ?? "";

export const renderWhatsappTemplate = (
  templateBody: string,
  context: WhatsappTemplateContext
): string => {
  const source = templateBody?.trim() || DEFAULT_WHATSAPP_TEMPLATE;

  const rendered = source.replace(TEMPLATE_PATTERN, (_, variableName: string) => {
    if (!(variableName in context)) {
      return "";
    }

    return sanitizeTemplateValue(context[variableName as keyof WhatsappTemplateContext]);
  });

  return rendered
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const getTemplateVariables = (): readonly string[] => WHATSAPP_TEMPLATE_VARIABLES;
