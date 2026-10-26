import { extractDigits } from "./phone";

/** CPF válido (11 dígitos, dígitos verificadores corretos, não repetido). */
export function isValidCpf(value: string | null | undefined): boolean {
  const digits = extractDigits(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

/** Só dígitos, ou `null` se inválido. */
export function normalizeCpf(value: string | null | undefined): string | null {
  return isValidCpf(value) ? extractDigits(value) : null;
}

/** 000.000.000-00 (aceita parcial, para máscara de input). */
export function formatCpf(value: string | null | undefined): string {
  const d = extractDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Exibição mascarada: •••.982.247-•• */
export function maskCpf(value: string | null | undefined): string {
  const d = extractDigits(value);
  if (d.length !== 11) return "";
  return `•••.${d.slice(3, 6)}.${d.slice(6, 9)}-••`;
}
