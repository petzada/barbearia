"use server";

import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { actionContext } from "./context";
import { DomainError, toActionResult } from "@/server/errors";
import { user } from "@/server/db/schema";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { deleteOwnAccount } from "@/server/account";
import { acceptTerms } from "@/server/terms";
import { createPaymentGateway } from "@/server/payments/service";

async function saveName(input: ProfileInput) {
  const { db, user: current } = await actionContext({ allowIncompleteProfile: true });
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  await db
    .update(user)
    .set({ name: parsed.data.fullName, profileCompleted: true })
    .where(eq(user.id, current.id));
}

/** Salva o nome no perfil. */
export async function saveProfileAction(input: ProfileInput) {
  return toActionResult(async () => {
    await saveName(input);
    revalidatePath("/", "layout");
    return null;
  });
}

/**
 * Conclui o cadastro de quem entrou pelo telefone. Não revalida: o
 * re-render de /bem-vindo redirecionaria antes da tela "Tudo pronto!".
 */
export async function saveOnboardingNameAction(input: ProfileInput) {
  return toActionResult(async () => {
    await saveName(input);
    return null;
  });
}

const AVATAR_TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Foto de perfil no R2. Cada um troca a própria; o admin troca a da equipe. */
export async function uploadAvatarAction(formData: FormData) {
  return toActionResult(async () => {
    const { db, actor } = await actionContext();
    const targetId = String(formData.get("userId") || actor.id);
    if (targetId !== actor.id && !actor.isAdmin) {
      throw new DomainError("forbidden", "Você só pode trocar a sua própria foto.");
    }
    const file = formData.get("file");
    if (!(file instanceof File)) throw new DomainError("invalid", "Escolha uma imagem.");
    const ext = AVATAR_TYPES[file.type];
    if (!ext) throw new DomainError("invalid", "Use uma imagem JPG, PNG ou WEBP.");
    if (file.size > AVATAR_MAX_BYTES) throw new DomainError("invalid", "A imagem pode ter no máximo 2 MB.");

    const key = `avatars/${targetId}-${Date.now()}.${ext}`;
    const { env } = await getCloudflareContext({ async: true });
    await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    await db.update(user).set({ image: `/media/${key}` }).where(eq(user.id, targetId));
    revalidatePath("/", "layout");
    return { image: `/media/${key}` };
  });
}

/** Liga/desliga os lembretes de horário pelo WhatsApp. */
export async function setWhatsappRemindersAction(enabled: boolean) {
  return toActionResult(async () => {
    const { db, user: current } = await actionContext();
    await db.update(user).set({ whatsappReminders: enabled }).where(eq(user.id, current.id));
    revalidatePath("/perfil");
    return null;
  });
}

/** Exclusão da própria conta (LGPD). A sessão é apagada junto. */
export async function deleteMyAccountAction() {
  return toActionResult(async () => {
    const { db, env, actor } = await actionContext();
    await deleteOwnAccount(db, actor, createPaymentGateway(env));
    return null;
  });
}

/** Aceite dos Termos de Uso e da Política de Privacidade (versão vigente). */
export async function acceptTermsAction(accepted: boolean) {
  return toActionResult(async () => {
    const { db, user: current } = await actionContext({ allowIncompleteProfile: true });
    await acceptTerms(db, current.id, { accepted });
    // Sem revalidatePath: re-renderizar /bem-vindo agora redirecionaria antes
    // da tela "Tudo pronto!". O destino seguinte usa navegação completa.
    return null;
  });
}
