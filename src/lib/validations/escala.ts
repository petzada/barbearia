import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const barberDaySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex, "Horário inválido"),
    endTime: z.string().regex(timeRegex, "Horário inválido"),
    isOff: z.boolean(),
  })
  .refine((d) => d.isOff || d.endTime > d.startTime, {
    message: "O fim do expediente precisa ser depois do início",
  });

export const barberWeekSchema = z.object({
  barberId: z.string().min(1),
  /** `null` = o barbeiro segue o horário da barbearia. */
  days: z
    .array(barberDaySchema)
    .length(7)
    .refine((rows) => new Set(rows.map((r) => r.weekday)).size === 7, "Informe os 7 dias")
    .nullable(),
});

export type BarberWeekInput = z.input<typeof barberWeekSchema>;

export const closureSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  reason: z.string().trim().min(2, "Informe o motivo").max(60),
});

export type ClosureInput = z.input<typeof closureSchema>;
