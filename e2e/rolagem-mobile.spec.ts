import { expect, test, type BrowserContext, type CDPSession, type Page } from "@playwright/test";
import { adminPhone, d1, login } from "./lib/helpers";

/**
 * Regressão: rolagem no celular sem "tremer". Arrasta com toques reais (CDP) em
 * cada tela — com embalo, devagar, passando do fim e do topo — e falha se:
 * - a posição volta sozinha (snap-back) durante o gesto;
 * - a altura do documento muda no meio do gesto (reflow enquanto rola);
 * - há layout shifts; ou
 * - alguma altura de tela usa `dvh` (muda quando a barra de endereço some) /
 *   <body> ou <html> têm `overflow` (no iOS, o body vira contêiner de rolagem
 *   e os elementos fixos tremem).
 * Também cobre a folha inferior (rolagem interna × fechar no arrasto) e os
 * carrosséis horizontais (não disputam a rolagem vertical da página).
 */

type Sample = { phase: string; y: number; sh: number; ih: number };
type Shift = { value: number; phase: string; nodes: string[] };

function instrument(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __s: Sample[]; __ls: Shift[]; __phase: string };
    w.__s = [];
    w.__ls = [];
    w.__phase = "idle";
    const tick = () => {
      w.__s.push({ phase: w.__phase, y: window.scrollY, sh: document.scrollingElement!.scrollHeight, ih: window.innerHeight });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; sources?: { node?: Element }[] })[]) {
        w.__ls.push({
          value: e.value,
          phase: w.__phase,
          nodes: (e.sources ?? []).map((s) => `${s.node?.tagName ?? "?"}.${String(s.node?.className ?? "").split(" ")[0]}`),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

async function touchDrag(
  cdp: CDPSession,
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  { steps = 12, durationMs = 160, holdMs = 0, phase }: { steps?: number; durationMs?: number; holdMs?: number; phase?: string } = {},
) {
  if (phase) await page.evaluate((p) => ((window as unknown as { __phase: string }).__phase = p), phase);
  const t0 = Date.now() / 1000;
  const pt = (x: number, y: number) => ({ x, y, radiusX: 2, radiusY: 2, force: 1, id: 1 });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(from.x, from.y)], timestamp: t0 });
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const e = 1 - (1 - k) * (1 - k); // dedo real: rápido no início, lento no fim
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [pt(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e)],
      timestamp: t0 + (durationMs * k) / 1000,
    });
    await page.waitForTimeout(durationMs / steps);
  }
  if (holdMs) await page.waitForTimeout(holdMs);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [], timestamp: t0 + (durationMs + holdMs) / 1000 });
}

/** Solta o dedo em movimento: gera embalo (fling). */
const fling = (cdp: CDPSession, page: Page, dy: number, phase: string) =>
  touchDrag(cdp, page, { x: 195, y: dy < 0 ? 720 : 220 }, { x: 195, y: (dy < 0 ? 720 : 220) + dy }, { steps: 10, durationMs: 120, phase });
/** Arrasta devagar e segura antes de soltar: sem embalo. */
const slowDrag = (cdp: CDPSession, page: Page, dy: number, phase: string) =>
  touchDrag(cdp, page, { x: 195, y: dy < 0 ? 700 : 240 }, { x: 195, y: (dy < 0 ? 700 : 240) + dy }, { steps: 20, durationMs: 400, holdMs: 120, phase });

async function scrollGesture(page: Page, cdp: CDPSession) {
  await fling(cdp, page, -500, "down1");
  await page.waitForTimeout(700);
  await slowDrag(cdp, page, -400, "down2");
  await page.waitForTimeout(400);
  await fling(cdp, page, -700, "down3");
  await page.waitForTimeout(700);
  await slowDrag(cdp, page, -500, "down4-passa-do-fim");
  await page.waitForTimeout(500);
  await fling(cdp, page, 500, "up1");
  await page.waitForTimeout(700);
  await slowDrag(cdp, page, 450, "up2");
  await page.waitForTimeout(400);
  await fling(cdp, page, 700, "up3");
  await page.waitForTimeout(700);
  await slowDrag(cdp, page, 500, "up4-passa-do-topo");
  await page.waitForTimeout(500);
}

async function collect(page: Page) {
  const { s, ls } = await page.evaluate(() => {
    const w = window as unknown as { __s: Sample[]; __ls: Shift[] };
    return { s: w.__s, ls: w.__ls };
  });
  const snapBacks: string[] = [];
  const heights = new Set<number>();
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1];
    const b = s[i];
    if (b.phase === "idle" || a.ih !== b.ih) continue;
    if (b.phase.startsWith("down") && b.y < a.y - 1) snapBacks.push(`${b.phase}: ${a.y}→${b.y}`);
    if (b.phase.startsWith("up") && a.y > 0 && b.y > a.y + 1) snapBacks.push(`${b.phase}: ${a.y}→${b.y}`);
    heights.add(b.sh);
  }
  return {
    samples: s.length,
    maxY: Math.max(...s.map((x) => x.y)),
    snapBacks,
    documentHeights: [...heights],
    layoutShifts: ls.filter((l) => l.phase !== "idle"),
  };
}

async function expectStableScroll(page: Page, path: string) {
  const cdp = await page.context().newCDPSession(page);
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  await instrument(page);
  await scrollGesture(page, cdp);
  const r = await collect(page);
  expect(r.samples, "amostras por frame").toBeGreaterThan(50);
  expect(r.snapBacks, `${path}: a rolagem voltou sozinha`).toEqual([]);
  expect(r.documentHeights.length, `${path}: a altura do documento mudou durante o gesto (${r.documentHeights.join(", ")})`).toBeLessThanOrEqual(1);
  expect(r.layoutShifts, `${path}: layout shift ao rolar`).toEqual([]);
  await cdp.detach();
}

test.describe("páginas públicas", () => {
  test("só a viewport rola e nenhuma altura de tela usa dvh", async ({ page }) => {
    await page.goto("/");
    const audit = await page.evaluate(() => {
      const cs = (el: Element) => getComputedStyle(el);
      const dvhRules: string[] = [];
      const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          if ("cssRules" in rule && rule.cssRules) walk(rule.cssRules as CSSRuleList);
          if (rule instanceof CSSStyleRule && /\d(dvh|dvw|vh)\b/.test(rule.style.cssText)) dvhRules.push(rule.cssText.slice(0, 120));
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          walk(sheet.cssRules);
        } catch {
          // folha de outra origem
        }
      }
      return {
        scroller: document.scrollingElement === document.documentElement,
        html: `${cs(document.documentElement).overflowX}/${cs(document.documentElement).overflowY}`,
        body: `${cs(document.body).overflowX}/${cs(document.body).overflowY}`,
        dvhRules,
      };
    });
    expect(audit.scroller).toBe(true);
    expect(audit.html).toBe("visible/visible");
    expect(audit.body).toBe("visible/visible");
    expect(audit.dvhRules).toEqual([]);
  });

  for (const path of ["/", "/termos", "/login"]) {
    test(`rolagem estável em ${path}`, async ({ page }) => {
      await expectStableScroll(page, path);
    });
  }

  test("carrossel de planos rola na horizontal sem brigar com a página", async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await page.goto("/");
    const row = page.locator("ul.overflow-x-auto").first();
    await row.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const box = (await row.boundingBox())!;
    const y0 = await page.evaluate(() => window.scrollY);
    const cx = box.x + box.width / 2;
    const cy = box.y + Math.min(box.height / 2, 60);
    await touchDrag(cdp, page, { x: cx + 80, y: cy }, { x: cx - 120, y: cy }, { holdMs: 100 });
    await page.waitForTimeout(400);
    const afterX = await row.evaluate((el) => ({
      scrollLeft: el.scrollLeft,
      pageY: window.scrollY,
      overscrollX: getComputedStyle(el).overscrollBehaviorX,
    }));
    expect(afterX.scrollLeft).toBeGreaterThan(50);
    expect(afterX.pageY).toBe(y0);
    expect(afterX.overscrollX).toBe("contain");
    // Arrasto vertical começando sobre o carrossel rola a página normalmente.
    await touchDrag(cdp, page, { x: cx, y: cy }, { x: cx, y: cy - 200 }, { holdMs: 100 });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y0 + 100);
  });
});

test.describe("áreas logadas", () => {
  // Um login só para a suíte; os códigos pedidos pelos outros specs saem da
  // janela do limite por número (whatsapp_logs) para o login não ser recusado.
  let state: Awaited<ReturnType<BrowserContext["storageState"]>>;

  test.beforeAll(async ({ browser }) => {
    d1("DELETE FROM whatsapp_logs WHERE kind = 'otp'");
    const context = await browser.newContext(test.info().project.use);
    const page = await context.newPage();
    await login(page, adminPhone(), "Admin Rolagem");
    state = await context.storageState();
    await context.close();
  });

  test.use({ storageState: async ({}, provide) => provide(state) });

  for (const path of ["/inicio", "/agendamentos", "/barbeiro", "/barbeiro/agenda", "/admin/gestao/servicos"]) {
    test(`rolagem estável em ${path}`, async ({ page }) => {
      await expectStableScroll(page, path);
    });
  }

  test("folha inferior: rola por dentro, fecha no arrasto e devolve a página como estava", async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await page.goto("/admin/gestao/planos");
    await page.waitForLoadState("networkidle");
    const before = await page.evaluate(() => ({ y: window.scrollY, body: document.body.style.cssText }));
    await page.getByRole("listitem").filter({ hasText: "Black" }).getByRole("button", { name: "Editar" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(500);
    const content = dialog.locator("[data-drawer-content]");
    const info = await content.evaluate((el) => ({
      scrollable: el.scrollHeight > el.clientHeight + 20,
      overscrollY: getComputedStyle(el).overscrollBehaviorY,
    }));
    expect(info.scrollable, "a folha de plano precisa ter corpo longo para o teste valer").toBe(true);
    expect(info.overscrollY).toBe("contain");
    const box = (await content.boundingBox())!;
    const cx = box.x + box.width / 2;
    // Arrastar o corpo para cima rola o conteúdo: a folha continua aberta e a página não se move.
    await touchDrag(cdp, page, { x: cx, y: box.y + box.height - 40 }, { x: cx, y: box.y + 40 }, { steps: 14, durationMs: 250, holdMs: 100 });
    await page.waitForTimeout(400);
    expect(await content.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
    expect(await page.evaluate(() => window.scrollY)).toBe(before.y);
    await expect(dialog).toBeVisible();
    // De volta ao topo do conteúdo, sem fechar.
    await touchDrag(cdp, page, { x: cx, y: box.y + 40 }, { x: cx, y: box.y + box.height - 40 }, { steps: 14, durationMs: 250, holdMs: 100 });
    await page.waitForTimeout(400);
    expect(await content.evaluate((el) => el.scrollTop)).toBe(0);
    await expect(dialog).toBeVisible();
    // Puxar pela alça fecha.
    const dbox = (await dialog.boundingBox())!;
    await touchDrag(cdp, page, { x: 195, y: dbox.y + 20 }, { x: 195, y: dbox.y + 420 }, { steps: 14, durationMs: 220 });
    await expect(dialog).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => ({ y: window.scrollY, body: document.body.style.cssText }))).toEqual(before);
  });
});
