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
export const walkInSchema = z
  .object({
    barberId: z.string().min(1),
    serviceId: z.string().min(1, "Escolha o serviço"),
    startsAt: z.number().int().positive("Horário inválido"),
    /** Cliente com conta (achado pelo WhatsApp)… */
    clientId: z.string().min(1).optional(),
    /** …ou só o nome, para quem não tem conta. */
    walkInName: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((v) => v.clientId || (v.walkInName && v.walkInName.length >= 2), {
    message: "Informe o cliente pelo WhatsApp ou digite o nome",
  });

export type WalkInInput = z.input<typeof walkInSchema>;

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido");

/** Bloqueio de um ou vários dias seguidos (férias). Sem horários = dia inteiro. */
export const blockRangeSchema = z
  .object({
    barberId: z.string().min(1),
    fromDate: dateKey,
    toDate: dateKey,
    startTime: time.optional(),
    endTime: time.optional(),
    note: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine((b) => b.toDate >= b.fromDate, { message: "A data final precisa ser depois da inicial" })
  .refine((b) => (b.startTime == null) === (b.endTime == null), {
    message: "Informe início e fim, ou deixe o dia inteiro",
  })
  .refine((b) => !b.startTime || !b.endTime || b.endTime > b.startTime, {
    message: "O fim do bloqueio precisa ser depois do início",
  });

export type BlockRangeInput = z.input<typeof blockRangeSchema>;
