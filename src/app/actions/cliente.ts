"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "./context";
import { toActionResult } from "@/server/errors";
import { cancelAppointment, createAppointment, getAvailableDays, getAvailableSlots } from "@/server/scheduling";
import { createFeedback } from "@/server/feedback";
import {
  cancelSubscription,
  createPaymentGateway,
  refreshPixPayment,
  simulatePixPayment,
  startAppointmentPix,
  startSubscriptionCheckout,
} from "@/server/payments/service";
import type { CreateAppointmentInput } from "@/lib/validations/agendamento";
import type { FeedbackInput } from "@/lib/validations/profile";

const refreshClientViews = () => {
  for (const path of ["/inicio", "/agendamentos", "/agendar", "/barbeiro", "/barbeiro/agenda", "/admin/agenda"]) {
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
    if (input.paymentChoice === "pix") {
      // Tenta gerar o Pix já; se o gateway falhar o agendamento continua válido.
      try {
        const payment = await startAppointmentPix(db, actor, createPaymentGateway(env), entry.id);
        return { entryId: entry.id, paymentId: payment.id };
      } catch (error) {
        console.warn("[agendar] Pix indisponível, segue para pagamento no local", error);
        return { entryId: entry.id, paymentId: null };
      }
    }
    return { entryId: entry.id, paymentId: null };
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
    const payment = await refreshPixPayment(db, createPaymentGateway(env), paymentId, { actor });
    if (payment.status !== "pending") refreshClientViews();
    return { status: payment.status };
  });
}

export async function simulatePixAction(paymentId: string) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    const payment = await simulatePixPayment(db, actor, createPaymentGateway(env), paymentId);
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

export async function subscribeAction(planId: string) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    return startSubscriptionCheckout(db, actor, createPaymentGateway(env), env, planId);
  });
}

export async function cancelMySubscriptionAction(subscriptionId: string) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    await cancelSubscription(db, actor, createPaymentGateway(env), subscriptionId);
    revalidatePath("/clube");
    return null;
  });
}
