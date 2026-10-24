import { z } from "zod";

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Informe seu nome")
    .max(80, "Nome muito longo")
    .refine((v) => /\p{L}/u.test(v), "Informe seu nome"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const teamMemberSchema = z.object({
  userId: z.string().min(1),
  isBarber: z.boolean(),
  isAdmin: z.boolean(),
  acceptingBookings: z.boolean(),
  commissionPercent: z.number().int().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
});

export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

export const feedbackSchema = z.object({
  entryId: z.string().min(1),
  rating: z.number().int().min(1, "Dê uma nota de 1 a 5").max(5),
  comment: z
    .string()
    .trim()
    .max(500, "Comentário muito longo")
    .optional()
    .transform((v) => (v ? v : null)),
});

export type FeedbackInput = z.input<typeof feedbackSchema>;
