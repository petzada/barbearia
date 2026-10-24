import { z } from "zod";
import { PLAN_CYCLES } from "@/lib/plans";

export const planFormSchema = z.object({
  id: z.string().min(1).optional(),
  slug: z
    .string()
    .trim()
    .min(2, "Informe um identificador")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífen"),
  name: z.string().trim().min(2, "Informe o nome do plano").max(40),
  description: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  priceCents: z.number().int().min(100, "O valor mínimo é R$ 1,00"),
  cycle: z.enum(PLAN_CYCLES),
  benefits: z
    .array(z.string().trim().min(1).max(100))
    .max(8, "No máximo 8 benefícios"),
  active: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export type PlanFormInput = z.input<typeof planFormSchema>;
