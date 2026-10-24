import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const businessHourRowSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    openTime: z.string().regex(timeRegex, "Horário inválido"),
    closeTime: z.string().regex(timeRegex, "Horário inválido"),
    isClosed: z.boolean(),
  })
  .refine((row) => row.isClosed || row.closeTime > row.openTime, {
    message: "O fechamento precisa ser depois da abertura",
  });

export const businessHoursFormSchema = z.object({
  rows: z
    .array(businessHourRowSchema)
    .length(7)
    .refine((rows) => new Set(rows.map((r) => r.weekday)).size === 7, {
      message: "Informe os 7 dias da semana",
    }),
});

export type BusinessHoursFormInput = z.infer<typeof businessHoursFormSchema>;

export const shopSettingsSchema = z.object({
  shopName: z.string().trim().min(2, "Informe o nome da barbearia").max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .nullable()
    .transform((v) => (v ? v : null)),
  address: z
    .string()
    .trim()
    .max(160)
    .nullable()
    .transform((v) => (v ? v : null)),
  instagram: z
    .string()
    .trim()
    .max(60)
    .nullable()
    .transform((v) => (v ? v.replace(/^@/, "") : null)),
  slotIntervalMinutes: z
    .number()
    .int()
    .refine((v) => [10, 15, 20, 30, 45, 60].includes(v), "Intervalo inválido"),
  minLeadMinutes: z.number().int().min(0).max(24 * 60),
  bookingWindowDays: z.number().int().min(1, "Mínimo de 1 dia").max(90, "Máximo de 90 dias"),
  cancelUntilMinutes: z.number().int().min(0).max(72 * 60),
});

export type ShopSettingsInput = z.input<typeof shopSettingsSchema>;
