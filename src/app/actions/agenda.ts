"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "./context";
import { toActionResult } from "@/server/errors";
import {
  cancelAppointment,
  completeAppointment,
  createBlock,
  markNoShow,
  registerLocalPayment,
  removeBlock,
} from "@/server/scheduling";
import type { CreateBlockInput, LocalPaymentMethod } from "@/lib/validations/agendamento";

const refreshAgendaViews = () => {
  for (const path of [
    "/barbeiro",
    "/barbeiro/agenda",
    "/barbeiro/bloqueios",
    "/barbeiro/ganhos",
    "/admin",
    "/admin/agenda",
    "/admin/financeiro",
    "/agendamentos",
    "/inicio",
  ]) {
    revalidatePath(path);
  }
};

function run<T>(fn: (ctx: Awaited<ReturnType<typeof actionContext>>) => Promise<T>) {
  return toActionResult(async () => {
    const result = await fn(await actionContext());
    refreshAgendaViews();
    return result;
  });
}

export async function createBlockAction(input: CreateBlockInput) {
  return run(async ({ db, actor }) => {
    await createBlock(db, actor, input);
    return null;
  });
}

export async function removeBlockAction(entryId: string) {
  return run(({ db, actor }) => removeBlock(db, actor, entryId).then(() => null));
}

export async function cancelEntryAction(entryId: string) {
  return run(({ db, actor }) => cancelAppointment(db, actor, entryId).then(() => null));
}

export async function completeEntryAction(entryId: string) {
  return run(({ db, actor }) => completeAppointment(db, actor, entryId).then(() => null));
}

export async function noShowEntryAction(entryId: string) {
  return run(({ db, actor }) => markNoShow(db, actor, entryId).then(() => null));
}

export async function registerLocalPaymentAction(entryId: string, method: LocalPaymentMethod) {
  return run(({ db, actor }) => registerLocalPayment(db, actor, entryId, method).then(() => null));
}
