"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "./context";
import { toActionResult } from "@/server/errors";
import { cancelAppointment, createAppointment, getAvailableDays, getAvailableSlots } from "@/server/scheduling";
import { createFeedback } from "@/server/feedback";
import {
  cancelSubscription,
  changeSubscriptionCard,
  createBillingDeps,
  createPaymentGateway,
  refreshPixPayment,
  simulatePixPayment,
  startAppointmentPix,
  subscribeWithCard,
  subscribeWithPix,
} from "@/server/payments/service";
import type { CreateAppointmentInput } from "@/lib/validations/agendamento";
import type { FeedbackInput } from "@/lib/validations/profile";

const refreshClientViews = () => {
  for (const path of ["/inicio", "/agendamentos", "/agendar", "/clube", "/barbeiro", "/barbeiro/agenda", "/admin/agenda"]) {
    revalidatePath(path);
  }
};

export async function fetchSlotsAction(input: { barberId: string; serviceId: string; dateKey: string }) {
  return toActionResult(async () => {
    const { db } = await actionContext();
    return getAvailableSlots(db, input);
  });
}

export async function fetchAvailableDaysAction(input: {
  barberId: string;
  serviceId: string;
  from: string;
  to: string;
}) {
  return toActionResult(async () => {
    const { db } = await actionContext();
    return getAvailableDays(db, input);
  });
}

export async function bookAppointmentAction(input: CreateAppointmentInput) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    const entry = await createAppointment(db, actor, input);
    refreshClientViews();
    const covered = entry.paymentMethod === "subscription";
    if (covered) return { entryId: entry.id, paymentId: null, covered };
    if (input.paymentChoice === "pix") {
      // Tenta gerar o Pix já; se o gateway falhar o agendamento continua válido.
      try {
        const payment = await startAppointmentPix(db, actor, createPaymentGateway(env), entry.id);
        return { entryId: entry.id, paymentId: payment.id, covered };
      } catch (error) {
        console.warn("[agendar] Pix indisponível, segue para pagamento no local", error);
        return { entryId: entry.id, paymentId: null, covered };
      }
    }
    return { entryId: entry.id, paymentId: null, covered };
  });
}

export async function cancelMyAppointmentAction(entryId: string) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await cancelAppointment(db, actor, entryId);
    refreshClientViews();
    return null;
  });
}

export async function startPixAction(entryId: string) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    const payment = await startAppointmentPix(db, actor, createPaymentGateway(env), entryId);
    revalidatePath("/agendamentos");
    return { paymentId: payment.id };
  });
}

export async function checkPixAction(paymentId: string) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    const payment = await refreshPixPayment(db, createBillingDeps(env), paymentId, { actor });
    if (payment.status !== "pending") refreshClientViews();
    return { status: payment.status };
  });
}

export async function simulatePixAction(paymentId: string) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    const payment = await simulatePixPayment(db, actor, createBillingDeps(env), paymentId);
    refreshClientViews();
    return { status: payment.status };
  });
}

export async function submitFeedbackAction(input: FeedbackInput) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await createFeedback(db, actor, input);
    revalidatePath("/agendamentos");
    revalidatePath("/inicio");
    return null;
  });
}

const refreshClubViews = () => {
  for (const path of ["/clube", "/inicio", "/agendar", "/admin/clube", "/admin"]) revalidatePath(path);
};

/** Assinar no cartão (token `ctok_` do abacatepay.js) — cobra o 1º ciclo e salva o cartão. */
export async function subscribeWithCardAction(input: {
  planId: string;
  token: string;
  taxId?: string;
  email?: string;
  consent: boolean;
}) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    const result = await subscribeWithCard(db, actor, createBillingDeps(env), input);
    refreshClubViews();
    return result;
  });
}

/** Assinar no Pix — devolve o pagamento para a tela do QR (/clube/pagar/[id]). */
export async function subscribeWithPixAction(planId: string) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    return subscribeWithPix(db, actor, createBillingDeps(env), { planId });
  });
}

/** Trocar o cartão: cobra o próximo ciclo no cartão novo e passa a usá-lo. */
export async function changeCardAction(input: { token: string; taxId?: string; email?: string; consent: boolean }) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    const result = await changeSubscriptionCard(db, actor, createBillingDeps(env), input);
    refreshClubViews();
    return result;
  });
}

/** Cancela as renovações; o acesso segue até o fim do período pago. */
export async function cancelMySubscriptionAction(subscriptionId: string) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    const { endsAt } = await cancelSubscription(db, actor, subscriptionId);
    refreshClubViews();
    return { endsAt: endsAt.getTime() };
  });
}
