// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OtpInput } from "./otp-input";

function Harness({ onComplete }: { onComplete: (code: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <>
      <OtpInput value={code} onChange={setCode} onComplete={onComplete} autoFocus />
      <output data-testid="code">{code}</output>
    </>
  );
}

const box = (n: number) => screen.getByLabelText(`Dígito ${n}`) as HTMLInputElement;

describe("OtpInput", () => {
  it("digita, avança o foco e envia sozinho no 6º dígito", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    expect(document.activeElement).toBe(box(1));
    "48291".split("").forEach((d, i) => fireEvent.change(box(i + 1), { target: { value: d } }));
    expect(document.activeElement).toBe(box(6));
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.change(box(6), { target: { value: "3" } });
    expect(screen.getByTestId("code").textContent).toBe("482913");
    expect(onComplete).toHaveBeenCalledWith("482913");
  });

  it("aceita colar o código inteiro e ignora letras", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.paste(box(1), { clipboardData: { getData: () => "12 34-56" } });
    expect(screen.getByTestId("code").textContent).toBe("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
    fireEvent.change(box(1), { target: { value: "a" } });
    expect(screen.getByTestId("code").textContent).toBe("123456");
  });

  it("autopreenchimento do teclado na primeira caixa distribui os dígitos", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    fireEvent.change(box(1), { target: { value: "987654" } });
    expect(onComplete).toHaveBeenCalledWith("987654");
  });

  it("backspace numa caixa vazia volta e apaga a anterior", () => {
    render(<Harness onComplete={vi.fn()} />);
    fireEvent.change(box(1), { target: { value: "1" } });
    fireEvent.change(box(2), { target: { value: "2" } });
    fireEvent.keyDown(box(3), { key: "Backspace" });
    expect(screen.getByTestId("code").textContent).toBe("1");
    expect(document.activeElement).toBe(box(2));
  });
});
