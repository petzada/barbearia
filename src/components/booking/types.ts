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
};

export type BookingRules = {
  bookingWindowDays: number;
  cancelUntilMinutes: number;
  /** Pix online disponível (AbacatePay configurado). */
  onlinePayment: boolean;
};
