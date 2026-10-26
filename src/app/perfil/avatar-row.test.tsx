// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const resizeAvatar = vi.fn();
const uploadAvatarAction = vi.fn();
const refresh = vi.fn();

vi.mock("@/lib/image-resize", () => ({ resizeAvatar: (...args: unknown[]) => resizeAvatar(...args) }));
vi.mock("@/app/actions/perfil", () => ({
  uploadAvatarAction: (...args: unknown[]) => uploadAvatarAction(...args),
  saveProfileAction: vi.fn(),
  setWhatsappRemindersAction: vi.fn(),
  saveOnboardingNameAction: vi.fn(),
  deleteMyAccountAction: vi.fn(),
  acceptTermsAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { AvatarRow } = await import("./profile-forms");
const { toast } = await import("sonner");

beforeEach(() => {
  resizeAvatar.mockReset();
  uploadAvatarAction.mockReset();
});

describe("AvatarRow", () => {
  it("reduz uma foto grande do celular antes de enviar", async () => {
    const small = new Blob(["x"], { type: "image/webp" });
    resizeAvatar.mockResolvedValue(small);
    uploadAvatarAction.mockResolvedValue({ ok: true, data: { image: "/media/avatars/u-1.webp" }, error: null });
    render(<AvatarRow userId="u-1" />);

    const big = new File([new Uint8Array(4 * 1024 * 1024)], "IMG_0001.HEIC", { type: "image/heic" });
    fireEvent.change(screen.getByLabelText("Escolher foto de perfil"), { target: { files: [big] } });

    await waitFor(() => expect(uploadAvatarAction).toHaveBeenCalledTimes(1));
    expect(resizeAvatar).toHaveBeenCalledWith(big);
    const form = uploadAvatarAction.mock.calls[0][0] as FormData;
    const sent = form.get("file") as File;
    expect(sent.size).toBe(small.size);
    expect(sent.name).toBe("avatar.webp");
    expect(form.get("userId")).toBe("u-1");
    expect(refresh).toHaveBeenCalled();
  });

  it("mostra erro amigável se a imagem não puder ser lida e não envia nada", async () => {
    resizeAvatar.mockRejectedValue(new Error("decode"));
    render(<AvatarRow />);
    const file = new File(["?"], "arquivo.bin", { type: "" });
    fireEvent.change(screen.getByLabelText("Escolher foto de perfil"), { target: { files: [file] } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Não conseguimos ler/)));
    expect(uploadAvatarAction).not.toHaveBeenCalled();
  });
});
