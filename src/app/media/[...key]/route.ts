import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Serve arquivos do bucket R2 `MEDIA` (fotos de perfil da equipe). */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  const objectKey = key.join("/");
  if (!/^avatars\/[\w-]+\.(webp|jpg|jpeg|png)$/.test(objectKey)) {
    return new Response("Não encontrado", { status: 404 });
  }
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.MEDIA.get(objectKey);
  if (!object) return new Response("Não encontrado", { status: 404 });
  return new Response(object.body as ReadableStream, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/webp",
      "Cache-Control": "public, max-age=86400",
      ETag: object.httpEtag,
    },
  });
}
