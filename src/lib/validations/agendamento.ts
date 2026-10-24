import { z } from "zod";

export const createAppointmentSchema = z.object({
  barberId: z.string().min(1, "Barbeiro inválido"),
  serviceId: z.string().min(1, "Serviço inválido"),
  /** Início em epoch ms (UTC). */
  startsAt: z.number().int().positive("Horário inválido"),
  paymentChoice: z.enum(["pix", "local"]),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const createBlockSchema = z
  .object({
    barberId: z.string().min(1),
    startsAt: z.number().int().positive(),
    endsAt: z.number().int().positive(),
    note: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine((b) => b.endsAt > b.startsAt, {
    message: "O fim do bloqueio precisa ser depois do início",
  });

export type CreateBlockInput = z.input<typeof createBlockSchema>;

export const LOCAL_PAYMENT_METHODS = ["dinheiro", "cartao", "pix_balcao"] as const;
export type LocalPaymentMethod = (typeof LOCAL_PAYMENT_METHODS)[number];
export const LOCAL_PAYMENT_LABELS: Record<LocalPaymentMethod, string> = {
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  pix_balcao: "Pix no balcão",
};
