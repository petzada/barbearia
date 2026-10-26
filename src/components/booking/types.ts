import type { BookingClub } from "@/lib/club";

export type BookingService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
};

export type BookingBarber = {
  id: string;
  name: string;
  image: string | null;
  ratingAverage: number | null;
  ratingCount: number;
};

export type BookingRules = {
  bookingWindowDays: number;
  cancelUntilMinutes: number;
  /** Pix online disponível (AbacatePay configurado). */
  onlinePayment: boolean;
  /** Assinatura ativa do cliente (Clube Moura), se houver. */
  club?: BookingClub | null;
};
