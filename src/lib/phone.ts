const ONLY_DIGITS_REGEX = /\D/g;

export type NormalizeBrazilPhoneResult = {
  isValid: boolean;
  normalized: string | null;
  reason?: string;
};

export const extractDigits = (value: string | null | undefined): string =>
  (value ?? "").replace(ONLY_DIGITS_REGEX, "");

const normalizeInternationalPrefix = (digits: string): string => {
  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  return digits;
};

export const normalizeBrazilPhone = (
  rawPhone: string | null | undefined
): NormalizeBrazilPhoneResult => {
  const cleanedDigits = normalizeInternationalPrefix(extractDigits(rawPhone));

  if (!cleanedDigits) {
    return {
      isValid: false,
      normalized: null,
      reason: "Telefone ausente.",
    };
  }

  const withCountryCode = cleanedDigits.startsWith("55")
    ? cleanedDigits
    : cleanedDigits.length === 10 || cleanedDigits.length === 11
      ? `55${cleanedDigits}`
      : cleanedDigits;

  if (!withCountryCode.startsWith("55")) {
    return {
      isValid: false,
      normalized: null,
      reason: "Telefone deve usar DDI 55.",
    };
  }

  if (withCountryCode.length !== 12 && withCountryCode.length !== 13) {
    return {
      isValid: false,
      normalized: null,
      reason: "Telefone deve ter 12 ou 13 digitos com DDI.",
    };
  }

  const ddd = withCountryCode.slice(2, 4);
  if (ddd.length !== 2 || ddd.startsWith("0")) {
    return {
      isValid: false,
      normalized: null,
      reason: "DDD invalido.",
    };
  }

  const localNumber = withCountryCode.slice(4);
  if (localNumber.length !== 8 && localNumber.length !== 9) {
    return {
      isValid: false,
      normalized: null,
      reason: "Numero local invalido.",
    };
  }

  return {
    isValid: true,
    normalized: withCountryCode,
  };
};

export const isValidBrazilPhone = (rawPhone: string | null | undefined): boolean =>
  normalizeBrazilPhone(rawPhone).isValid;

/** Formato E.164 usado como login (Better Auth): "+5511999999999". */
export const toE164BrazilPhone = (rawPhone: string | null | undefined): string | null => {
  const result = normalizeBrazilPhone(rawPhone);
  return result.isValid && result.normalized ? `+${result.normalized}` : null;
};

export const isE164BrazilPhone = (value: string): boolean =>
  /^\+55[1-9]\d(?:9\d{8}|\d{8})$/.test(value);

/** "+5511987654321" → "(11) 98765-4321". */
export const formatBrazilPhone = (value: string | null | undefined): string => {
  const result = normalizeBrazilPhone(value);
  if (!result.isValid || !result.normalized) return value ?? "";
  const ddd = result.normalized.slice(2, 4);
  const local = result.normalized.slice(4);
  const split = local.length === 9 ? 5 : 4;
  return `(${ddd}) ${local.slice(0, split)}-${local.slice(split)}`;
};

/** Máscara progressiva para o campo de telefone: "(11) 98765-4321". */
export const maskBrazilPhoneInput = (value: string): string => {
  const digits = extractDigits(value).replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  if (local.length <= 4) return `(${ddd}) ${local}`;
  const split = local.length > 8 ? 5 : 4;
  return `(${ddd}) ${local.slice(0, split)}-${local.slice(split)}`;
};
