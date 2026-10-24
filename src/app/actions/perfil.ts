"use server";

import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { actionContext } from "./context";
import { DomainError, toActionResult } from "@/server/errors";
import { user } from "@/server/db/schema";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";

/** Salva o nome (e conclui o cadastro de quem entrou pelo telefone). */
export async function saveProfileAction(input: ProfileInput) {
  return toActionResult(async () => {
    const { db, user: current } = await actionContext({ allowIncompleteProfile: true });
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
    }
    await db
      .update(user)
      .set({ name: parsed.data.fullName, profileCompleted: true })
      .where(eq(user.id, current.id));
    revalidatePath("/", "layout");
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
