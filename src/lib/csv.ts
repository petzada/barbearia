/**
 * CSV para Excel/Google Planilhas em pt-BR: separador ";" (a vírgula é o
 * decimal), BOM UTF-8 para acentos e aspas quando preciso.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** 4500 → "45,00" (sem símbolo, para somar na planilha). */
export const centsToDecimal = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
