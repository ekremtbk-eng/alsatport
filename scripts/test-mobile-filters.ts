/**
 * Mobile filter sheet regression test: drives a local Chrome over the DevTools protocol (no extra deps).
 *
 *   SECURITY_TEST_BASE=http://localhost:3013 npx tsx scripts/test-mobile-filters.ts
 *   MOBILE_FILTER_SCOPE=all   -> also open the sheet for every listing category (slower)
 *   CHROME_PATH=...           -> browser binary (defaults to the usual Chrome / Edge install paths)
 *
 * This is emulation: Chrome's device mode with touch input and a shrinking viewport stands in for the
 * on-screen keyboard (Android's resizes-content model). iOS keeps the layout viewport and shrinks only the
 * visual viewport; that model is reproduced with a scripted visualViewport. Real devices must still be checked.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { categories, hrefForCategoryListings, walkCategories, type Category } from "../src/data/categories";

const BASE = (process.env.SECURITY_TEST_BASE ?? "http://localhost:3013").replace("127.0.0.1", "localhost").replace(/\/$/, "");
const SCOPE_ALL = process.env.MOBILE_FILTER_SCOPE === "all";
/** Optional narrowing while debugging: MOBILE_FILTER_WIDTHS=390,320  MOBILE_FILTER_PAGES=otomobil */
const ONLY_WIDTHS = (process.env.MOBILE_FILTER_WIDTHS ?? "").split(",").map(Number).filter(Boolean);
const ONLY_PAGES = (process.env.MOBILE_FILTER_PAGES ?? "").split(",").filter(Boolean);

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IOS_CHROME_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36";
const SAMSUNG_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36";

type Device = { name: string; width: number; height: number; dpr: number; ua: string; ios?: boolean };
const DEVICES: Device[] = [
  { name: "iPhone SE 320 (iOS Safari)", width: 320, height: 568, dpr: 2, ua: IOS_UA, ios: true },
  { name: "iPhone 15 390 (iOS Safari)", width: 390, height: 844, dpr: 3, ua: IOS_UA, ios: true },
  { name: "iPhone 15 Pro Max 430 (iOS Chrome)", width: 430, height: 932, dpr: 3, ua: IOS_CHROME_UA, ios: true },
  { name: "Galaxy S24 360 (Samsung Internet)", width: 360, height: 780, dpr: 3, ua: SAMSUNG_UA },
  { name: "Pixel 9 412 (Android Chrome)", width: 412, height: 915, dpr: 2.625, ua: ANDROID_UA },
  { name: "iPhone 15 landscape 844x390", width: 844, height: 390, dpr: 3, ua: IOS_UA, ios: true },
  { name: "iPad Air 820 (iPadOS Safari)", width: 820, height: 1180, dpr: 2, ua: IPAD_UA, ios: true },
];

/** Representative categories for the full keyboard scenario; MOBILE_FILTER_SCOPE=all adds every listing category. */
const SCENARIO_SLUGS = ["otomobil", "satilik-konut", "cep-telefonu", "motosiklet", "is-makineleri", "arazi-suv-pickup"];
const EXTRA_PAGES = ["/ara?q=telefon", "/acil"];

// ---------------------------------------------------------------- CDP plumbing

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };
class Cdp {
  private id = 0;
  private pending = new Map<number, Pending>();
  constructor(private ws: WebSocket) {
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data)) as { id?: number; result?: unknown; error?: { message: string } };
      if (msg.id == null) return;
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    });
  }
  send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}, sessionId?: string) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise<T>((resolve, reject) => this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject }));
  }
}

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean) as string[];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("Chrome not found; set CHROME_PATH");
  return found;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function launch(): Promise<{ proc: ChildProcess; cdp: Cdp; dir: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), "ap-mf-"));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(
    chromePath(),
    [`--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "about:blank"],
    { stdio: "ignore" },
  );
  let wsUrl = "";
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await sleep(250);
    try {
      const info = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as { webSocketDebuggerUrl: string };
      wsUrl = info.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
  }
  if (!wsUrl) throw new Error("Chrome did not start");
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => {
    ws.addEventListener("open", r, { once: true });
    ws.addEventListener("error", j, { once: true });
  });
  return { proc, cdp: new Cdp(ws), dir };
}

class Page {
  constructor(private cdp: Cdp, private session: string) {}
  send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}) {
    return this.cdp.send<T>(method, params, this.session);
  }
  async eval<T>(expression: string): Promise<T> {
    const r = await this.send<{ result: { value: T }; exceptionDetails?: { text: string; exception?: { description?: string } } }>(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
    );
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }
  async waitFor(expression: string, ms = 15000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await this.eval<boolean>(`Boolean(${expression})`).catch(() => false)) return true;
      await sleep(150);
    }
    return false;
  }
  async emulate(d: Device, height = d.height) {
    await this.send("Emulation.setDeviceMetricsOverride", { width: d.width, height, deviceScaleFactor: d.dpr, mobile: d.width < 1024 || Boolean(d.ios) });
    await this.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await this.send("Emulation.setEmitTouchEventsForMouse", { enabled: true, configuration: "mobile" });
    await this.send("Emulation.setUserAgentOverride", { userAgent: d.ua, platform: d.ios ? "iPhone" : "Linux armv8l" });
  }
  async goto(url: string) {
    await this.send("Page.navigate", { url });
    await sleep(300);
    return this.waitFor("document.readyState === 'complete' && document.querySelector('main, #__next, body > div')");
  }
  /**
   * Finger drag as raw touch points; Chrome turns them into a scroll gesture, honouring touch-action and
   * preventDefault() in touchmove. (Input.synthesizeScrollGesture does not scroll anything in headless mode.)
   */
  async swipe(x: number, y: number, dy: number) {
    const steps = 12;
    await this.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) {
      await this.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + Math.round((dy * i) / steps) }] });
    }
    await this.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(300);
  }
  async tap(x: number, y: number) {
    await this.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await this.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(200);
  }
}

async function openPage(cdp: Cdp) {
  const { targetId } = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
  const page = new Page(cdp, sessionId);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  return { page, targetId };
}

// ---------------------------------------------------------------- reporting

let failed = 0;
let passed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

// ---------------------------------------------------------------- in-page probes (plain JS strings)

const PROBE = String.raw`
(() => {
  const sheet = () => document.querySelector('.filter-sheet');
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const scrollBox = () => { const s = sheet(); return s && [...s.querySelectorAll('[data-filter-scroll]')].filter(vis).sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0]; };
  const textEntry = 'input:not([type=checkbox]):not([type=radio]):not([type=range]), select, textarea';
  /** True when the centre of el is the topmost thing on screen there (not under header/footer/keyboard edge). */
  const reachable = (el, bottomLimit) => {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + Math.min(r.width / 2, 40), 1), innerWidth - 1);
    const y = r.top + Math.min(r.height / 2, 20);
    if (y < 0 || y > bottomLimit) return false;
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit) || hit.contains(el) || (el.tagName === 'INPUT' && hit.closest('label') === el.closest('label')));
  };
  window.__mf = { sheet, scrollBox, vis, reachable, textEntry };
  return true;
})()`;

const OPEN_SHEET = String.raw`
(async () => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.offsetParent && /^(Filtrele|Filtreler)\b/.test((b.innerText || b.getAttribute('aria-label') || '').trim()));
  if (!btn) return 'no-button';
  btn.click();
  for (let i = 0; i < 40 && !document.querySelector('.filter-sheet'); i++) await new Promise((r) => setTimeout(r, 100));
  const s = document.querySelector('.filter-sheet');
  return s ? (s.classList.contains('is-adv') ? 'adv' : s.querySelector('.qf-tabs') ? 'quick' : 'std') : 'no-sheet';
})()`;

const SHEET_KINDS = ["std", "adv", "quick"];

/** The filter button is visible and hydrated; a click on server-rendered markup before React attaches is dropped. */
const FILTER_BUTTON_READY =
  "[...document.querySelectorAll('button')].some((b) => b.offsetParent && /^(Filtrele|Filtreler)\\b/.test((b.innerText || '').trim()) && Object.keys(b).some((k) => k.startsWith('__reactProps')))";

/** Layout facts for the open sheet, with the keyboard closed. */
const LAYOUT = String.raw`
(() => {
  const s = __mf.sheet(); const r = s.getBoundingClientRect();
  const head = s.querySelector('.filter-head, .adv-head'); const foot = s.querySelector('.filter-sheet-foot, .adv-foot');
  const hr = head && head.getBoundingClientRect(); const fr = foot && getComputedStyle(foot).display !== 'none' ? foot.getBoundingClientRect() : null;
  const wide = [...s.querySelectorAll('input, select, button, summary, a, label')].filter(__mf.vis).filter((el) => { const b = el.getBoundingClientRect(); return b.right > innerWidth + 1 || b.left < -1; }).map((el) => (el.className || el.tagName).toString().slice(0, 40));
  const small = [...s.querySelectorAll(__mf.textEntry)].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.className.toString().slice(0, 30));
  return {
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    vw: innerWidth, vh: innerHeight,
    pageOverflowX: document.documentElement.scrollWidth > innerWidth + 1,
    wide, small,
    headOk: !!hr && hr.top >= -1 && hr.bottom <= innerHeight * 0.4,
    footOk: !!fr && fr.bottom <= innerHeight + 1 && fr.top > innerHeight * 0.45,
    bodyLock: getComputedStyle(document.body).position === 'fixed' && document.documentElement.classList.contains('filter-sheet-open'),
  };
})()`;

/** Opens every accordion, then walks each control into view inside its scroll box and hit-tests it. */
const REACH_ALL = String.raw`
(async () => {
  const s = __mf.sheet();
  s.querySelectorAll('details').forEach((d) => { d.open = true; });
  await new Promise((r) => setTimeout(r, 150));
  const foot = s.querySelector('.filter-sheet-foot, .adv-foot');
  const limit = foot && getComputedStyle(foot).display !== 'none' ? foot.getBoundingClientRect().top - 2 : innerHeight - 2;
  const controls = [...s.querySelectorAll('[data-filter-scroll] :is(input, select, summary, button)')].filter(__mf.vis).filter((el) => !el.disabled && !el.closest('ul.flt-ss-list'));
  const missed = [];
  for (const el of controls) {
    let box = el.parentElement;
    while (box && box !== s && !(box.matches('[data-filter-scroll]'))) box = box.parentElement;
    if (!box || box === s) continue;
    const r = el.getBoundingClientRect(); const v = box.getBoundingClientRect();
    if (r.top < v.top + 4) box.scrollTop -= v.top + 4 - r.top;
    else if (r.bottom > Math.min(v.bottom, limit) - 4) box.scrollTop += r.bottom - (Math.min(v.bottom, limit) - 4);
    await new Promise((res) => requestAnimationFrame(() => res(null)));
    if (!__mf.reachable(el, limit)) missed.push((el.getAttribute('aria-label') || el.innerText || el.placeholder || el.className || el.tagName).toString().trim().slice(0, 30));
  }
  s.querySelectorAll('[data-filter-scroll]').forEach((b) => { b.scrollTop = 0; });
  return { total: controls.length, missed };
})()`;

// ---------------------------------------------------------------- scenarios

async function prepare(page: Page, d: Device) {
  await page.emulate(d);
  await page.goto(`${BASE}/`);
  await page.eval(`(() => {
    localStorage.setItem('alsatport-i18n-v1', JSON.stringify({ locale: 'tr', inTurkeyHint: true }));
    localStorage.setItem('alsatport-loc-prompt-v1', JSON.stringify({ at: Date.now() }));
    return true;
  })()`);
}

async function openFilters(page: Page, url: string) {
  if (!(await page.goto(`${BASE}${url}`))) return "load-failed";
  await page.waitFor(FILTER_BUTTON_READY, 12000);
  await page.eval(PROBE);
  return page.eval<string>(OPEN_SHEET);
}

/** Layout + reachability with the keyboard closed. */
async function layoutChecks(page: Page, d: Device, tag: string) {
  const l = await page.eval<{
    rect: number[]; vw: number; vh: number; pageOverflowX: boolean; wide: string[]; small: string[]; headOk: boolean; footOk: boolean; bodyLock: boolean;
  }>(LAYOUT);
  const fits = l.rect[0] === 0 && l.rect[1] === 0 && Math.abs(l.rect[2] - l.vw) <= 1 && Math.abs(l.rect[3] - l.vh) <= 1;
  check(`${tag} sheet covers the viewport exactly`, fits, `rect=${l.rect.join(",")} vp=${l.vw}x${l.vh}`);
  check(`${tag} no horizontal overflow`, !l.pageOverflowX && l.wide.length === 0, l.wide.slice(0, 3).join(" | "));
  if (d.width < 1024) check(`${tag} every text field is >=16px (no iOS focus zoom)`, l.small.length === 0, l.small.slice(0, 3).join(" | "));
  check(`${tag} header visible`, l.headOk);
  check(`${tag} footer actions visible`, l.footOk);
  check(`${tag} page behind is locked`, l.bodyLock);
  const reach = await page.eval<{ total: number; missed: string[] }>(REACH_ALL);
  check(`${tag} all ${reach.total} filter controls reachable`, reach.total > 0 && reach.missed.length === 0, reach.missed.slice(0, 4).join(" | "));
}

/** The user's scenario: brand → keyboard → move around → price → close keyboard → il/ilçe → clear → show. */
async function keyboardScenario(page: Page, d: Device, kind: string, tag: string) {
  const kbHeight = Math.round(d.height * (d.height < d.width ? 0.42 : 0.55));
  const scroll = await page.eval<number>("__mf.scrollBox() ? __mf.scrollBox().scrollHeight - __mf.scrollBox().clientHeight : 0");

  // A finger on the header must not move the sheet or the page.
  await page.swipe(Math.round(d.width / 2), 24, -200);
  const still = await page.eval<{ top: number; y: number }>("({ top: Math.round(__mf.sheet().getBoundingClientRect().top), y: scrollY })");
  check(`${tag} dragging the header moves nothing`, still.top === 0 && still.y === 0, JSON.stringify(still));

  if (scroll > 40) {
    const mid = await page.eval<number[]>("(() => { const r = __mf.scrollBox().getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; })()");
    await page.swipe(mid[0], mid[1], -Math.min(400, scroll));
    const down = await page.eval<number>("__mf.scrollBox().scrollTop");
    await page.swipe(mid[0], mid[1], Math.min(400, scroll));
    const up = await page.eval<number>("__mf.scrollBox().scrollTop");
    check(`${tag} finger scroll moves the filter list down and back up`, down > 20 && up < down, `down=${down} up=${up}`);
    // Pulling past the top must not chain into the page behind the sheet.
    await page.swipe(mid[0], mid[1], 600);
    const chained = await page.eval<{ top: number; y: number; sheetTop: number }>("({ top: __mf.scrollBox().scrollTop, y: scrollY, sheetTop: Math.round(__mf.sheet().getBoundingClientRect().top) })");
    check(`${tag} overscroll at the top stays inside the sheet`, chained.top === 0 && chained.y === 0 && chained.sheetTop === 0, JSON.stringify(chained));
  }

  if (kind === "quick") {
    const opened = await page.eval<boolean>(`(async () => {
      const s = __mf.sheet(); const wait = () => new Promise((r) => setTimeout(r, 300));
      const brand = s.querySelector('.qf-row[data-row=brand]');
      if (brand) brand.click();
      else { s.querySelector('.qf-row[data-row=location]')?.click(); await wait(); s.querySelector('.qf-row[data-row=city]')?.click(); }
      await wait();
      return !!s.querySelector('.qf-search input');
    })()`);
    check(`${tag} quick: Marka (or İl) opens a searchable list`, opened);
    if (!opened) return;
  }
  const brandSel =
    kind === "adv"
      ? "__mf.sheet().querySelector('.adv-search input')"
      : kind === "quick"
        ? "__mf.sheet().querySelector('.qf-search input')"
        : "([...__mf.sheet().querySelectorAll('input[role=combobox]')].find((i) => !i.disabled && /marka/i.test(i.closest('details, label')?.innerText || '')) || __mf.sheet().querySelector('input[role=combobox]:not(:disabled)'))";
  const focused = await page.eval<boolean>(`(() => {
    const el = ${brandSel};
    if (!el) return false;
    el.closest('details') && (el.closest('details').open = true);
    el.focus();
    return document.activeElement === el;
  })()`);
  check(`${tag} focus the brand/search field`, focused);
  if (!focused) return;

  await page.emulate(d, kbHeight);
  await sleep(600);
  const kb = await page.eval<{ isKb: boolean; h: number; top: number; fieldOk: boolean; footHidden: boolean; headOk: boolean; listOk: boolean; y: number }>(`(() => {
    const s = __mf.sheet(); const el = document.activeElement; const r = el.getBoundingClientRect();
    const box = el.closest('[data-filter-scroll]');
    const v = box ? box.getBoundingClientRect() : s.getBoundingClientRect();
    const foot = s.querySelector('.filter-sheet-foot, .adv-foot'); const head = s.querySelector('.filter-head, .adv-head');
    const list = el.getAttribute('aria-controls') && document.getElementById(el.getAttribute('aria-controls'));
    const lr = list && list.getBoundingClientRect();
    return {
      isKb: s.classList.contains('is-kb'),
      h: Math.round(s.getBoundingClientRect().height),
      top: Math.round(s.getBoundingClientRect().top),
      fieldOk: r.top >= Math.max(0, v.top - 1) && r.bottom <= Math.min(innerHeight, v.bottom) + 1,
      footHidden: !foot || getComputedStyle(foot).display === 'none',
      headOk: !!head && head.getBoundingClientRect().top >= -1 && head.getBoundingClientRect().bottom < innerHeight / 2,
      listOk: !lr || (lr.top < innerHeight - 40 && lr.top >= v.top),
      y: scrollY,
    };
  })()`);
  check(`${tag} keyboard: sheet shrinks to the visible height`, kb.h === kbHeight && kb.top === 0, `h=${kb.h} want=${kbHeight} top=${kb.top}`);
  check(`${tag} keyboard: focused field stays in view`, kb.fieldOk);
  check(`${tag} keyboard: header stays, actions step aside`, kb.isKb && kb.headOk && kb.footHidden);
  check(`${tag} keyboard: option list opens inside the visible area`, kb.listOk);
  check(`${tag} keyboard: page behind did not scroll`, kb.y === 0, `scrollY=${kb.y}`);

  if (kind === "std") {
    const esc = { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 };
    const listOpen = "(() => { const el = document.activeElement; return !!(el && el.getAttribute('aria-expanded') === 'true'); })()";
    if (await page.eval<boolean>(listOpen)) {
      await page.send("Input.dispatchKeyEvent", esc);
      await page.send("Input.dispatchKeyEvent", { ...esc, type: "keyUp" });
      await sleep(250);
      const s = await page.eval<{ sheet: boolean; list: boolean }>(`({ sheet: !!document.querySelector('.filter-sheet'), list: ${listOpen} })`);
      check(`${tag} Escape closes the option list first, the sheet stays`, s.sheet && !s.list, JSON.stringify(s));
      if (!s.sheet) return;
    }
  }

  if (kind === "std") {
    const price = await page.eval<boolean>(`(async () => {
      const det = [...__mf.sheet().querySelectorAll('details')].find((x) => /fiyat/i.test(x.querySelector('summary')?.innerText || ''));
      const inp = det ? det.querySelector('input[inputmode=numeric]') : null;
      if (!inp) return true;
      det.open = true;
      inp.focus();
      await new Promise((r) => setTimeout(r, 450));
      return document.activeElement === inp;
    })()`);
    if (price) {
      await page.send("Input.insertText", { text: "250000" });
      await sleep(400);
      const pv = await page.eval<{ value: string; inView: boolean }>(`(() => {
        const el = document.activeElement; const r = el.getBoundingClientRect(); const v = (el.closest('[data-filter-scroll]') || __mf.sheet()).getBoundingClientRect();
        return { value: el.value || '', inView: r.top >= v.top - 1 && r.bottom <= Math.min(v.bottom, innerHeight) + 1 };
      })()`);
      check(`${tag} keyboard: price typed into a visible field`, pv.value === "" || pv.value === "250000" ? pv.inView : false, JSON.stringify(pv));
    }
  }

  if (kind === "quick") {
    const esc = { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 };
    await page.send("Input.dispatchKeyEvent", esc);
    await page.send("Input.dispatchKeyEvent", { ...esc, type: "keyUp" });
    await sleep(300);
    // Without a brand row the scenario went two screens deep (Adres → İl), so one step back lands on Adres.
    const back = await page.eval<{ sheet: boolean; main: boolean }>(`({
      sheet: !!document.querySelector('.filter-sheet'),
      main: !!document.querySelector('.filter-sheet ' + (document.querySelector('.filter-sheet .qf-row[data-row=brand], .filter-sheet .qf-tabs') ? '.qf-tabs' : '.qf-row[data-row=city]')),
    })`);
    check(`${tag} quick: Escape goes back one screen, the sheet stays`, back.sheet && back.main, JSON.stringify(back));
    if (!back.sheet) return;
    const price = await page.eval<boolean>(`(async () => {
      const s = __mf.sheet();
      const backBtn = () => s.querySelector('.qf-head .qf-icon-btn[aria-label]:not(.filter-x)');
      while (!s.querySelector('.qf-tabs') && backBtn()) { backBtn().click(); await new Promise((r) => setTimeout(r, 250)); }
      __mf.sheet().querySelector('.qf-row[data-row=priceMin]')?.click();
      await new Promise((r) => setTimeout(r, 300));
      const inp = __mf.sheet().querySelector('#qf-priceMin');
      if (!inp) return false;
      inp.focus();
      await new Promise((r) => setTimeout(r, 300));
      return document.activeElement === inp;
    })()`);
    check(`${tag} quick: price min field focusable`, price);
    if (price) {
      await page.send("Input.insertText", { text: "250000" });
      await sleep(400);
      const pv = await page.eval<{ value: string; inView: boolean; kb: boolean }>(`(() => {
        const el = document.activeElement; const r = el.getBoundingClientRect(); const v = (el.closest('[data-filter-scroll]') || __mf.sheet()).getBoundingClientRect();
        return { value: el.value || '', inView: r.top >= v.top - 1 && r.bottom <= Math.min(v.bottom, innerHeight) + 1 && r.right <= innerWidth + 1 && r.left >= -1, kb: __mf.sheet().classList.contains('is-kb') };
      })()`);
      check(`${tag} keyboard: price typed into a visible field`, pv.value === "250.000" && pv.inView && pv.kb, JSON.stringify(pv));
    }
  }

  await page.eval("document.activeElement && document.activeElement.blur(), true");
  await page.emulate(d);
  await sleep(600);
  const after = await page.eval<{ isKb: boolean; h: number; footOk: boolean }>(`(() => {
    const s = __mf.sheet(); const foot = s.querySelector('.filter-sheet-foot, .adv-foot');
    return { isKb: s.classList.contains('is-kb'), h: Math.round(s.getBoundingClientRect().height), footOk: !!foot && getComputedStyle(foot).display !== 'none' && foot.getBoundingClientRect().bottom <= innerHeight + 1 };
  })()`);
  check(`${tag} keyboard closed: full height and actions are back`, !after.isKb && after.h === d.height && after.footOk, JSON.stringify(after));

  if (kind === "std") {
    const loc = await page.eval<{ city: string; district: string; ok: boolean }>(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const s = __mf.sheet();
      const det = [...s.querySelectorAll('details')].find((x) => /adres/i.test(x.querySelector('summary')?.innerText || ''));
      if (!det) return { city: '', district: '', ok: false };
      det.open = true; await wait(100);
      const pick = async (input, want) => {
        input.focus(); await wait(150);
        const list = document.getElementById(input.getAttribute('aria-controls'));
        const btn = list && ([...list.querySelectorAll('button')].find((b) => b.innerText.trim() === want) || [...list.querySelectorAll('button')][1]);
        if (!btn) return '';
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); btn.click(); await wait(200);
        input.blur(); await wait(200);
        return input.value;
      };
      const boxes = () => [...det.querySelectorAll('input[role=combobox]')];
      const city = await pick(boxes()[0], 'Ankara');
      const d = boxes()[1];
      const district = d && !d.disabled ? await pick(d, 'Çankaya') : '';
      return { city, district, ok: true };
    })()`);
    check(`${tag} il and ilçe can be chosen`, loc.ok && Boolean(loc.city) && Boolean(loc.district), JSON.stringify(loc));

    const cleared = await page.eval<string>(`(async () => {
      const btn = __mf.sheet().querySelector('.flt-clear-btn'); if (!btn) return 'no-clear';
      btn.click(); await new Promise((r) => setTimeout(r, 300));
      const det = [...__mf.sheet().querySelectorAll('details')].find((x) => /adres/i.test(x.querySelector('summary')?.innerText || ''));
      const box = det && det.querySelector('input[role=combobox]');
      return box ? box.value : 'no-box';
    })()`);
    // Pages without a clear action (e.g. /acil) simply have nothing to test here.
    if (cleared !== "no-clear") check(`${tag} Temizle clears the location`, cleared === "", `il="${cleared}"`);
  }

  if (kind === "quick") {
    const loc = await page.eval<{ city: string; district: string; keptPrice: boolean }>(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const s = __mf.sheet();
      const back = () => s.querySelector('.qf-head .qf-icon-btn[aria-label]:not(.filter-x)');
      while (!s.querySelector('.qf-tabs') && back()) { back().click(); await wait(250); }
      s.querySelector('.qf-row[data-row=location]')?.click(); await wait(250);
      const pick = async (row, want) => {
        const r = s.querySelector('.qf-row[data-row=' + row + ']');
        if (!r || r.disabled) return '';
        r.click(); await wait(250);
        const opt = [...s.querySelectorAll('.qf-opt')].find((o) => o.innerText.trim() === want);
        if (!opt) return '';
        opt.click(); await wait(400);
        return s.querySelector('.qf-row[data-row=' + row + '] .qf-row-val')?.innerText.trim() || '';
      };
      const city = await pick('city', 'Ankara');
      const district = await pick('district', 'Çankaya');
      while (!s.querySelector('.qf-tabs') && back()) { back().click(); await wait(250); }
      return { city, district, keptPrice: /priceMin=250000/.test(location.search) };
    })()`);
    check(`${tag} quick: il and ilçe can be chosen`, loc.city === "Ankara" && loc.district === "Çankaya", JSON.stringify(loc));
    check(`${tag} quick: changing location keeps the other filters`, loc.keptPrice, JSON.stringify(loc));

    const cleared = await page.eval<{ url: string; val: string }>(`(async () => {
      __mf.sheet().querySelector('.filter-sheet-foot .flt-clear-btn')?.click();
      await new Promise((r) => setTimeout(r, 500));
      return { url: location.search, val: __mf.sheet().querySelector('.qf-row[data-row=location] .qf-row-val')?.innerText.trim() || '' };
    })()`);
    check(`${tag} quick: Temizle clears every filter`, !/(city|district|priceMin|marka)=/.test(cleared.url), JSON.stringify(cleared));
  }
}

async function closeChecks(page: Page, d: Device, kind: string, tag: string, scrolledTo: number) {
  const res = await page.eval<{ closed: boolean; y: number; locked: boolean; html: boolean; focusOk: boolean }>(`(async () => {
    const s = __mf.sheet();
    const go = ${kind === "adv" ? "s.querySelector('.adv-btn.is-go')" : "s.querySelector('.filter-sheet-foot .acil-search-btn')"};
    if (go) go.click(); else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    for (let i = 0; i < 30 && document.querySelector('.filter-sheet'); i++) await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 250));
    return {
      closed: !document.querySelector('.filter-sheet'),
      y: Math.round(scrollY),
      locked: getComputedStyle(document.body).position === 'fixed',
      html: document.documentElement.classList.contains('filter-sheet-open'),
      focusOk: document.activeElement !== document.body || true,
    };
  })()`);
  check(`${tag} "İlanları göster" closes the sheet and unlocks the page`, res.closed && !res.locked && !res.html, JSON.stringify(res));
  // Applying filters may navigate (new URL, scroll to top); closing without applying must restore the spot.
  if (scrolledTo > 0) {
    const back = await page.eval<{ y: number }>(`(async () => {
      document.querySelector('.browse-filter-btn, button') && 0;
      const btn = [...document.querySelectorAll('button')].find((b) => b.offsetParent && /^(Filtrele|Filtreler)\\b/.test((b.innerText || '').trim()));
      window.scrollTo(0, ${scrolledTo}); await new Promise((r) => setTimeout(r, 150));
      const before = Math.round(scrollY);
      btn && btn.click(); await new Promise((r) => setTimeout(r, 500));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await new Promise((r) => setTimeout(r, 400));
      return { y: Math.round(scrollY) - before };
    })()`);
    check(`${tag} closing restores the page scroll position`, back.y === 0, `delta=${back.y}`);
  }
  void d;
}

/** iOS model: layout viewport stays, visual viewport shrinks and pans (offsetTop) or zooms (scale/offsetLeft). */
async function iosViewportModel(page: Page, d: Device, url: string, tag: string) {
  await page.goto(`${BASE}${url}`);
  await page.waitFor(FILTER_BUTTON_READY, 12000);
  await page.eval(`(() => {
    const fake = new EventTarget();
    Object.assign(fake, { width: innerWidth, height: innerHeight, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { value: fake, configurable: true });
    window.__fakeVV = fake;
    return true;
  })()`);
  await page.eval(PROBE);
  const kind = await page.eval<string>(OPEN_SHEET);
  if (kind === "no-button" || kind === "no-sheet") {
    check(`${tag} iOS model: sheet opens`, false, kind);
    return;
  }
  const r = await page.eval<{ panned: string; zoomed: string; back: string }>(`(async () => {
    const s = __mf.sheet(); const vv = window.__fakeVV; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const box = () => { const b = s.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)].join(','); };
    const brandRow = s.querySelector('.qf-row[data-row=brand]');
    if (brandRow) { brandRow.click(); await wait(300); }
    const input = s.querySelector('input[role=combobox]:not(:disabled), .adv-search input, .qf-search input');
    if (input && input.closest('details')) input.closest('details').open = true;
    input && input.focus();
    if (document.activeElement !== input) return { panned: 'focus-failed', zoomed: '', back: '' };
    Object.assign(vv, { height: Math.round(innerHeight * 0.55), offsetTop: 140 }); vv.dispatchEvent(new Event('resize')); await wait(200);
    const panned = box() + (s.classList.contains('is-kb') ? ',kb' : ',nokb');
    Object.assign(vv, { scale: 1.25, width: Math.round(innerWidth / 1.25), height: Math.round(innerHeight * 0.55 / 1.25), offsetLeft: 37, offsetTop: 150 }); vv.dispatchEvent(new Event('resize')); await wait(200);
    const zoomed = box();
    input && input.blur();
    Object.assign(vv, { scale: 1, width: innerWidth, height: innerHeight, offsetLeft: 0, offsetTop: 0 }); vv.dispatchEvent(new Event('resize')); await wait(450);
    const back = box() + (s.classList.contains('is-kb') ? ',kb' : ',nokb');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    return { panned, zoomed, back };
  })()`);
  const h55 = Math.round(d.height * 0.55);
  check(`${tag} iOS model: sheet follows the panned visual viewport`, r.panned === `0,140,${d.width},${h55},kb`, r.panned);
  check(`${tag} iOS model: sheet follows a zoomed visual viewport (no crop)`, r.zoomed === `37,150,${Math.round(d.width / 1.25)},${Math.round((d.height * 0.55) / 1.25)}`, r.zoomed);
  check(`${tag} iOS model: keyboard closed -> back to full screen`, r.back === `0,0,${d.width},${d.height},nokb`, r.back);
  await page.eval("delete window.visualViewport, true").catch(() => undefined);
}

function listingUrls() {
  const urls = new Set<string>();
  walkCategories(categories, (cat: Category) => {
    const href = hrefForCategoryListings(cat);
    if (href.startsWith("/ara?kategori=") || href.startsWith("/is-ilanlari") || href.startsWith("/ustalar-hizmetler")) urls.add(href);
  });
  return [...urls];
}

async function main() {
  const health = await fetch(`${BASE}/`).then((r) => r.status).catch(() => 0);
  if (health !== 200) throw new Error(`${BASE} not reachable (status ${health}); start the app first`);
  const scenario = SCENARIO_SLUGS.map((slug) => `/ara?kategori=${slug}`).concat(EXTRA_PAGES);
  const { proc, cdp, dir } = await launch();
  try {
    const { page } = await openPage(cdp);
    for (const d of DEVICES) {
      if (ONLY_WIDTHS.length && !ONLY_WIDTHS.includes(d.width)) continue;
      console.log(`\n== ${d.name} (${d.width}x${d.height}) ==`);
      await prepare(page, d);
      const pages = d.width === 390 ? scenario : scenario.slice(0, 2).concat(EXTRA_PAGES.slice(1));
      for (const url of pages) {
        if (ONLY_PAGES.length && !ONLY_PAGES.some((p) => url.includes(p))) continue;
        const tag = `[${d.width}x${d.height} ${url}]`;
        const kind = await openFilters(page, url);
        if (!SHEET_KINDS.includes(kind)) {
          check(`${tag} filter sheet opens`, false, kind);
          continue;
        }
        await layoutChecks(page, d, tag);
        await keyboardScenario(page, d, kind, tag);
        const scrolledTo = await page.eval<number>("Math.min(400, Math.max(0, document.documentElement.scrollHeight - innerHeight))").catch(() => 0);
        await closeChecks(page, d, kind, tag, kind === "std" ? 0 : scrolledTo);
      }
      if (d.ios && d.width < 1024) await iosViewportModel(page, d, scenario[0], `[${d.width}x${d.height}]`);
    }

    if (SCOPE_ALL) {
      const d = DEVICES[1];
      console.log(`\n== every listing category on ${d.name} ==`);
      await prepare(page, d);
      for (const url of listingUrls()) {
        const kind = await openFilters(page, url);
        const tag = `[all ${url}]`;
        if (!SHEET_KINDS.includes(kind)) {
          check(`${tag} filter sheet opens`, false, kind);
          continue;
        }
        const l = await page.eval<{ rect: number[]; vw: number; vh: number; pageOverflowX: boolean; wide: string[]; small: string[]; headOk: boolean; footOk: boolean }>(LAYOUT);
        const reach = await page.eval<{ total: number; missed: string[] }>(REACH_ALL);
        const ok = !l.pageOverflowX && !l.wide.length && !l.small.length && l.headOk && l.footOk && reach.total > 0 && !reach.missed.length;
        check(`${tag} layout, 16px fields, ${reach.total} controls reachable`, ok, ok ? "" : JSON.stringify({ wide: l.wide.slice(0, 2), small: l.small.slice(0, 2), head: l.headOk, foot: l.footOk, missed: reach.missed.slice(0, 3) }));
        await page.eval("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })), true");
      }
    }
  } finally {
    proc.kill();
    await sleep(500);
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* chrome may still hold files briefly */
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
