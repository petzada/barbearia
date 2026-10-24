"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "./context";
import { DomainError, toActionResult } from "@/server/errors";
import { upsertService } from "@/server/catalog";
import { saveBusinessHours, updateShopSettings } from "@/server/settings";
import { findUserByPhone, updateTeamMember } from "@/server/team";
import { cancelSubscription, createPaymentGateway, grantManualSubscription, upsertPlan } from "@/server/payments/service";
import {
  createInstance,
  createWhatsappGateway,
  deleteInstance,
  refreshQrCode,
  sendTestMessage,
  syncInstanceStatus,
  updateReminderSettings,
} from "@/server/whatsapp/service";
import { assertAdmin } from "@/server/actor";
import type { ServiceFormInput } from "@/lib/validations/servico";
import type { BusinessHoursFormInput, ShopSettingsInput } from "@/lib/validations/settings";
import type { TeamMemberInput } from "@/lib/validations/profile";
import type { PlanFormInput } from "@/lib/validations/plano";

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

export async function findUserByPhoneAction(phone: string) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    return findUserByPhone(db, actor, phone);
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

export async function whatsappSaveRemindersAction(input: { remindersEnabled: boolean; reminderTemplate: string | null }) {
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
