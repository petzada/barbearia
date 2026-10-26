import { describe, expect, it } from "vitest";
import { coverCrop } from "./image-resize";

describe("coverCrop", () => {
  it("recorta o centro de uma foto em pé e reduz para 512", () => {
    expect(coverCrop(3024, 4032)).toEqual({ sx: 0, sy: 504, sw: 3024, sh: 3024, size: 512 });
  });
  it("recorta o centro de uma foto deitada", () => {
    expect(coverCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, sw: 3000, sh: 3000, size: 512 });
  });
  it("não amplia imagens pequenas", () => {
    expect(coverCrop(300, 200)).toEqual({ sx: 50, sy: 0, sw: 200, sh: 200, size: 200 });
  });
  it("respeita o tamanho máximo pedido", () => {
    expect(coverCrop(1000, 1000, 256).size).toBe(256);
  });
});
