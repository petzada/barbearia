// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useRef } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { CardForm, cardErrorMessage, type CardFormHandle } from "./card-form";
import { CardCheckout } from "@/app/(cliente)/clube/card-checkout";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// next/script não carrega nada no jsdom: dispara onReady como se o script tivesse carregado.
vi.mock("next/script", () => ({
  default: function ScriptMock({ onReady }: { onReady?: () => void }) {
    useEffect(() => onReady?.(), [onReady]);
    return null;
  },
}));

const mount = vi.fn(async () => {});
const tokenize = vi.fn(async () => ({ token: "ctok_test", brand: "VISA", lastFour: "4242" }));
const destroy = vi.fn();
const create = vi.fn(() => ({ mount, tokenize, destroy }));

beforeEach(() => {
  window.AbacatePay = { create };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  delete window.AbacatePay;
});

const payer = { name: "Ana Souza", cellphone: "(11) 96000-1234", email: "ana@email.com", billingEmail: null, taxId: null };

describe("CardForm (abacatepay.js)", () => {
  it("monta o formulário com a chave pública e tokeniza pelo handle", async () => {
    let handle: CardFormHandle | null = null;
    function Harness() {
      const ref = useRef<CardFormHandle | null>(null);
      useEffect(() => {
        handle = ref.current;
      });
      return <CardForm publicKey="pk_test_123" amountCents={19990} handleRef={ref} />;
    }
    const { unmount } = render(<Harness />);
    await waitFor(() => expect(mount).toHaveBeenCalledWith("#abacatepay-card"));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ publicKey: "pk_test_123", amount: 19990, locale: "pt" }));
    await waitFor(() => expect(screen.queryByText(/Carregando formulário/)).not.toBeInTheDocument());

    const result = await handle!.tokenize({ name: "Ana", email: "a@b.com", taxId: "52998224725", cellphone: "(11) 96000-1234" });
    expect(result).toEqual({ token: "ctok_test", brand: "VISA", lastFour: "4242" });
    unmount();
    expect(destroy).toHaveBeenCalled();
  });

  it("mostra erro se o formulário não montar", async () => {
    mount.mockRejectedValueOnce(new Error("invalid key"));
    const ref = { current: null };
    render(<CardForm publicKey="pk_bad" amountCents={100} handleRef={ref} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível carregar/);
  });

  it("traduz os códigos de erro do abacatepay.js", () => {
    expect(cardErrorMessage({ code: "THREE_DS_FAILED" })).toMatch(/verificação de segurança/);
    expect(cardErrorMessage({ code: "CARD_INCOMPLETE" })).toMatch(/Preencha/);
    expect(cardErrorMessage(new Error("x"))).toMatch(/Não foi possível validar/);
  });
});

describe("CardCheckout", () => {
  async function renderCheckout(onSubmit = vi.fn(async () => {})) {
    render(<CardCheckout publicKey="pk_test" amountCents={19990} payer={payer} submitLabel="Assinar" onSubmit={onSubmit} />);
    const button = screen.getByRole("button", { name: /Assinar/ });
    await waitFor(() => expect(button).toBeEnabled());
    return { onSubmit, button };
  }

  it("exige CPF válido e a autorização antes de tokenizar", async () => {
    const { onSubmit, button } = await renderCheckout();
    fireEvent.click(button);
    expect(toast.error).toHaveBeenCalledWith("Informe um CPF válido.");
    fireEvent.change(screen.getByLabelText("CPF do titular"), { target: { value: "52998224725" } });
    expect(screen.getByLabelText("CPF do titular")).toHaveValue("529.982.247-25");
    fireEvent.click(button);
    expect(toast.error).toHaveBeenLastCalledWith("Marque a autorização de cobrança no cartão.");
    expect(tokenize).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("tokeniza com os dados do pagador e envia token + CPF + consentimento", async () => {
    const { onSubmit, button } = await renderCheckout();
    fireEvent.change(screen.getByLabelText("CPF do titular"), { target: { value: "529.982.247-25" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(tokenize).toHaveBeenCalledWith({
      name: "Ana Souza",
      email: "ana@email.com",
      taxId: "52998224725",
      cellphone: "(11) 96000-1234",
    });
    expect(onSubmit).toHaveBeenCalledWith({ token: "ctok_test", taxId: "52998224725", consent: true });
  });

  it("mostra a mensagem do erro de tokenização (ex.: 3DS)", async () => {
    tokenize.mockRejectedValueOnce(Object.assign(new Error("3ds"), { code: "THREE_DS_FAILED" }));
    const { onSubmit, button } = await renderCheckout();
    fireEvent.change(screen.getByLabelText("CPF do titular"), { target: { value: "52998224725" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/verificação de segurança/)));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("pede e-mail quando a conta foi criada pelo telefone", async () => {
    const onSubmit = vi.fn(async () => {});
    render(
      <CardCheckout
        publicKey="pk_test"
        amountCents={19990}
        payer={{ ...payer, email: null, taxId: "52998224725" }}
        submitLabel="Assinar"
        onSubmit={onSubmit}
      />,
    );
    const button = screen.getByRole("button", { name: /Assinar/ });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);
    expect(toast.error).toHaveBeenCalledWith("Informe um e-mail válido.");
    fireEvent.change(screen.getByLabelText("E-mail para comprovantes"), { target: { value: "ana@email.com" } });
    fireEvent.click(button);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ token: "ctok_test", taxId: "52998224725", email: "ana@email.com", consent: true }),
    );
  });
});
