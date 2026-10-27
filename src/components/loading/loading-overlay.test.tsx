// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { acquireBusy, useBusy } from "./busy";
import { LoadingOverlay } from "./loading-overlay";
import { internalNavigationTarget } from "./navigation-busy";

function Busy({ active }: { active: boolean }) {
  useBusy(active);
  return null;
}

describe("LoadingOverlay", () => {
  it("aparece enquanto houver alguma espera e some quando todas terminam", () => {
    const { rerender } = render(
      <>
        <LoadingOverlay />
        <Busy active={false} />
      </>,
    );
    expect(screen.queryByRole("status")).toBeNull();

    rerender(
      <>
        <LoadingOverlay />
        <Busy active />
      </>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");

    let release = () => {};
    act(() => {
      release = acquireBusy();
    });
    rerender(
      <>
        <LoadingOverlay />
        <Busy active={false} />
      </>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      release();
      release();
    });
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("internalNavigationTarget", () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
  const here = { origin: "https://moura.app", pathname: "/inicio", search: "" };
  const anchor = (href: string, target = "", download = false) => ({
    href,
    target,
    hasAttribute: (name: string) => name === "download" && download,
  });

  it("devolve o destino de um link interno para outra página", () => {
    expect(internalNavigationTarget(click, anchor("https://moura.app/agendar?s=1"), here)).toBe("/agendar?s=1");
  });

  it("ignora a mesma página, âncoras, links externos, nova aba e download", () => {
    expect(internalNavigationTarget(click, anchor("https://moura.app/inicio#topo"), here)).toBeNull();
    expect(internalNavigationTarget(click, anchor("https://wa.me/5511"), here)).toBeNull();
    expect(internalNavigationTarget(click, anchor("https://moura.app/agendar", "_blank"), here)).toBeNull();
    expect(internalNavigationTarget(click, anchor("https://moura.app/recibo", "", true), here)).toBeNull();
    expect(internalNavigationTarget({ ...click, metaKey: true }, anchor("https://moura.app/agendar"), here)).toBeNull();
  });
});
