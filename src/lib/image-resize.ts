/** Tamanho final das fotos de perfil (quadradas). */
export const AVATAR_SIZE = 512;

export type CoverCrop = { sx: number; sy: number; sw: number; sh: number; size: number };

/**
 * Recorte central quadrado ("cover") de uma imagem `width`×`height`, com lado
 * final `max` (sem ampliar imagens menores).
 */
export function coverCrop(width: number, height: number, max = AVATAR_SIZE): CoverCrop {
  const side = Math.min(width, height);
  return {
    sx: Math.round((width - side) / 2),
    sy: Math.round((height - side) / 2),
    sw: side,
    sh: side,
    size: Math.max(1, Math.min(max, side)),
  };
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  // createImageBitmap respeita a orientação EXIF; no Safari, <img> decodifica HEIC.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // formato não suportado pelo createImageBitmap (ex.: HEIC) → tenta <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Converte qualquer foto do celular (JPG, PNG, HEIC no iPhone…) num quadrado
 * de até 512 px em WebP (ou JPEG se o navegador não gerar WebP), leve o
 * bastante para o envio.
 */
export async function resizeAvatar(file: Blob, max = AVATAR_SIZE): Promise<Blob> {
  const image = await decode(file);
  try {
    const crop = coverCrop(image.width, image.height, max);
    const canvas = document.createElement("canvas");
    canvas.width = crop.size;
    canvas.height = crop.size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.size, crop.size);
    const webp = await toBlob(canvas, "image/webp", 0.85);
    if (webp && webp.type === "image/webp") return webp;
    const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
    if (!jpeg) throw new Error("Não foi possível converter a imagem.");
    return jpeg;
  } finally {
    image.close();
  }
}
