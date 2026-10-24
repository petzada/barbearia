import { z } from "zod";

export const serviceFormSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Informe o nome").max(60),
  description: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  durationMinutes: z
    .number()
    .int()
    .min(5, "Duração mínima de 5 minutos")
    .max(480, "Duração máxima de 8 horas")
    .refine((v) => v % 5 === 0, "Use múltiplos de 5 minutos"),
  priceCents: z.number().int().min(0, "Preço inválido"),
  active: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export type ServiceFormInput = z.input<typeof serviceFormSchema>;
