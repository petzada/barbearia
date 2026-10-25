"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "./context";
import { DomainError, toActionResult } from "@/server/errors";
import { reorderServices, setServiceActive, upsertService } from "@/server/catalog";
import { addClosure, removeClosure, saveBarberWeek } from "@/server/schedule-config";
import { closePayout, type PayoutMethod } from "@/server/payouts";
import { getSubscriptionDetail } from "@/server/club-admin";
import { saveBusinessHours, updateShopSettings } from "@/server/settings";
import { cancelInvite, findUserByPhone, inviteTeamMember, updateTeamMember } from "@/server/team";
import { cancelSubscription, createPaymentGateway, grantManualSubscription, upsertPlan } from "@/server/payments/service";
import {
  createInstance,
  createWhatsappGateway,
  deleteInstance,
  refreshQrCode,
  sendTestMessage,
  syncInstanceStatus,
  sendTeamInvite,
  updateReminderSettings,
} from "@/server/whatsapp/service";
import { assertAdmin } from "@/server/actor";
import type { ServiceFormInput } from "@/lib/validations/servico";
import type { BusinessHoursFormInput, ShopSettingsInput } from "@/lib/validations/settings";
import type { TeamMemberInput } from "@/lib/validations/profile";
import type { PlanFormInput } from "@/lib/validations/plano";
import type { BarberWeekInput, ClosureInput } from "@/lib/validations/escala";

function revalidate(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

export async function saveServiceAction(input: ServiceFormInput) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await upsertService(db, actor, input);
    revalidate("/admin/gestao/servicos", "/agendar", "/inicio", "/");
    return null;
  });
}

export async function saveBusinessHoursAction(input: BusinessHoursFormInput) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await saveBusinessHours(db, actor, input);
    revalidate("/admin/gestao/horarios", "/agendar");
    return null;
  });
}

export async function saveShopSettingsAction(input: ShopSettingsInput) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await updateShopSettings(db, actor, input);
    revalidate("/admin/gestao/horarios", "/agendar", "/agendamentos", "/");
    return null;
  });
}

export async function saveTeamMemberAction(input: TeamMemberInput) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await updateTeamMember(db, actor, input);
    revalidate("/admin/gestao/equipe", "/agendar");
    return null;
  });
}

export async function savePlanAction(input: PlanFormInput) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await upsertPlan(db, actor, input);
    revalidate("/admin/gestao/planos", "/admin/clube", "/clube", "/");
    return null;
  });
}

export async function grantManualSubscriptionAction(input: { phone: string; planId: string; method: string }) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    const client = await findUserByPhone(db, actor, input.phone);
    if (!client) throw new DomainError("not_found", "Nenhum cliente com esse WhatsApp.");
    await grantManualSubscription(db, actor, { userId: client.id, planId: input.planId, method: input.method });
    revalidate("/admin/clube", "/admin/financeiro", "/admin");
    return null;
  });
}

export async function adminCancelSubscriptionAction(subscriptionId: string) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    assertAdmin(actor);
    await cancelSubscription(db, actor, createPaymentGateway(env), subscriptionId);
    revalidate("/admin/clube");
    return null;
  });
}

// WhatsApp -------------------------------------------------------------------

async function whatsappContext() {
  const ctx = await actionContext();
  assertAdmin(ctx.actor);
  return { ...ctx, gateway: createWhatsappGateway(ctx.env) };
}

export async function whatsappCreateInstanceAction(instanceName?: string) {
  return toActionResult(async () => {
    const { db, actor, gateway } = await whatsappContext();
    await createInstance(db, actor, gateway, instanceName);
    revalidate("/admin/gestao/whatsapp");
    return null;
  });
}

export async function whatsappRefreshQrAction() {
  return toActionResult(async () => {
    const { db, actor, gateway } = await whatsappContext();
    await refreshQrCode(db, actor, gateway);
    revalidate("/admin/gestao/whatsapp");
    return null;
  });
}

export async function whatsappSyncAction() {
  return toActionResult(async () => {
    const { db, gateway } = await whatsappContext();
    const config = await syncInstanceStatus(db, gateway);
    revalidate("/admin/gestao/whatsapp");
    return { status: config.status };
  });
}

export async function whatsappDeleteInstanceAction() {
  return toActionResult(async () => {
    const { db, actor, gateway } = await whatsappContext();
    await deleteInstance(db, actor, gateway);
    revalidate("/admin/gestao/whatsapp");
    return null;
  });
}

export async function whatsappSaveRemindersAction(input: {
  remindersEnabled: boolean;
  reminderTemplate: string | null;
  reminderHour?: number;
}) {
  return toActionResult(async () => {
    const { db, actor } = await whatsappContext();
    await updateReminderSettings(db, actor, input);
    revalidate("/admin/gestao/whatsapp");
    return null;
  });
}

export async function whatsappTestAction(phone: string) {
  return toActionResult(async () => {
    const { db, actor, gateway } = await whatsappContext();
    await sendTestMessage(db, actor, gateway, phone);
    revalidate("/admin/gestao/whatsapp");
    return null;
  });
}

// Serviços: ordem e ativo -----------------------------------------------------

export async function reorderServicesAction(orderedIds: string[]) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await reorderServices(db, actor, orderedIds);
    revalidate("/admin/gestao/servicos", "/agendar", "/");
    return null;
  });
}

export async function setServiceActiveAction(id: string, active: boolean) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await setServiceActive(db, actor, id, active);
    revalidate("/admin/gestao/servicos", "/admin/gestao", "/agendar", "/");
    return null;
  });
}

// Escala e feriados ------------------------------------------------------------

export async function saveBarberWeekAction(input: BarberWeekInput) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await saveBarberWeek(db, actor, input);
    revalidate("/admin/gestao/equipe", "/agendar", "/admin/agenda", "/barbeiro");
    return null;
  });
}

export async function addClosureAction(input: ClosureInput) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await addClosure(db, actor, input);
    revalidate("/admin/gestao/horarios", "/agendar", "/admin/agenda");
    return null;
  });
}

export async function removeClosureAction(dateKey: string) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await removeClosure(db, actor, dateKey);
    revalidate("/admin/gestao/horarios", "/agendar", "/admin/agenda");
    return null;
  });
}

// Equipe: convite --------------------------------------------------------------

export async function inviteTeamMemberAction(input: { phone: string; isBarber: boolean; isAdmin: boolean }) {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    const gateway = createWhatsappGateway(env);
    const result = await inviteTeamMember(db, actor, input, (to) =>
      sendTeamInvite(db, gateway, { to, appBaseUrl: env.appBaseUrl }),
    );
    revalidate("/admin/gestao/equipe");
    return result;
  });
}

export async function cancelInviteAction(phone: string) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    await cancelInvite(db, actor, phone);
    revalidate("/admin/gestao/equipe");
    return null;
  });
}

// Repasses ---------------------------------------------------------------------

export async function closePayoutAction(input: {
  barberId: string;
  from: string;
  to: string;
  method: PayoutMethod;
  note?: string;
}) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    const payout = await closePayout(db, actor, {
      barberId: input.barberId,
      period: { from: input.from, to: input.to },
      method: input.method,
      note: input.note,
    });
    revalidate("/admin/financeiro", "/barbeiro/ganhos");
    return { amountCents: payout.amountCents, entriesCount: payout.entriesCount };
  });
}

// Clube ------------------------------------------------------------------------

export async function subscriptionDetailAction(subscriptionId: string) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    const detail = await getSubscriptionDetail(db, actor, subscriptionId);
    return {
      planId: detail.plan.id,
      planName: detail.plan.name,
      memberName: detail.member.name,
      memberPhone: detail.member.phoneNumber,
      status: detail.subscription.status,
      provider: detail.subscription.provider,
      method: detail.subscription.method,
      currentPeriodEnd: detail.subscription.currentPeriodEnd?.getTime() ?? null,
      history: detail.history.map((p) => ({
        id: p.id,
        paidAt: p.paidAt?.getTime() ?? null,
        amountCents: p.amountCents,
        method: p.method,
      })),
    };
  });
}

export async function renewManualSubscriptionAction(input: { subscriptionId: string; method: string }) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    const detail = await getSubscriptionDetail(db, actor, input.subscriptionId);
    await grantManualSubscription(db, actor, {
      userId: detail.member.id,
      planId: detail.plan.id,
      method: input.method,
    });
    revalidate("/admin/clube", "/admin/financeiro", "/admin");
    return null;
  });
}
