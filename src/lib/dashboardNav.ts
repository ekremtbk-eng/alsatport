import { paymentsPaused } from "@/lib/campaign";

export const DASH_PANELS = [
  "ozet",
  "ilanlarim",
  "fav-ilan",
  "fav-arama",
  "fav-satici",
  "mesajlar",
  "soru-cevap",
  "teklifler",
  "sparam",
  "eticaret",
  "guvenli",
  "bildirimler",
  "kisisel",
  "odeme",
  "hareketler",
  "iptal",
  "guvenlik",
  "sifre",
  "iki-asama",
  "engellenenler",
  "cihazlar",
  "bildirim-ayarlari",
  "okundu",
  "pazarlama",
  "hareket",
  "qr",
  "kurumsal",
] as const;

export type DashPanelId = (typeof DASH_PANELS)[number];

export type DashNode =
  | { kind: "item"; id: DashPanelId; labelKey: string }
  | { kind: "link"; id: string; href: string; labelKey: string }
  | { kind: "group"; id: string; labelKey: string; children: DashNode[] };

/** Wallet / escrow / payment panels: kept in code for PayTR, hidden while payments are paused. */
const PAYMENT_PANELS: readonly DashPanelId[] = ["sparam", "eticaret", "guvenli", "odeme", "hareketler"];

export function isPanelHidden(id: DashPanelId) {
  return paymentsPaused() && PAYMENT_PANELS.includes(id);
}

function pruneHidden(nodes: DashNode[]): DashNode[] {
  return nodes.flatMap((n): DashNode[] => {
    if (n.kind === "item") return isPanelHidden(n.id) ? [] : [n];
    if (n.kind === "link") return [n];
    const children = pruneHidden(n.children);
    return children.length ? [{ ...n, children }] : [];
  });
}

const FULL_DASH_NAV: DashNode[] = [
  { kind: "item", id: "ozet", labelKey: "dash.ozet" },
  {
    kind: "group",
    id: "ilan",
    labelKey: "dash.g.ilan",
    children: [
      { kind: "item", id: "ilanlarim", labelKey: "dash.ilanlarim" },
      { kind: "item", id: "kurumsal", labelKey: "dash.biz" },
    ],
  },
  {
    kind: "group",
    id: "fav",
    labelKey: "dash.g.fav",
    children: [
      { kind: "item", id: "fav-ilan", labelKey: "dash.fav.ilan" },
      { kind: "item", id: "fav-arama", labelKey: "dash.fav.arama" },
      { kind: "item", id: "fav-satici", labelKey: "dash.fav.satici" },
    ],
  },
  {
    kind: "group",
    id: "msg",
    labelKey: "dash.g.msg",
    children: [
      { kind: "item", id: "mesajlar", labelKey: "dash.msg" },
      { kind: "item", id: "soru-cevap", labelKey: "dash.qa" },
      { kind: "item", id: "teklifler", labelKey: "dash.offers" },
    ],
  },
  {
    kind: "group",
    id: "shop",
    labelKey: "dash.g.shop",
    children: [
      { kind: "item", id: "sparam", labelKey: "dash.sparam" },
      { kind: "item", id: "eticaret", labelKey: "dash.ecom" },
      { kind: "item", id: "guvenli", labelKey: "dash.safe" },
    ],
  },
  { kind: "item", id: "bildirimler", labelKey: "dash.notifs" },
  {
    kind: "group",
    id: "account",
    labelKey: "dash.g.account",
    children: [
      {
        kind: "group",
        id: "info",
        labelKey: "dash.g.info",
        children: [
          { kind: "item", id: "kisisel", labelKey: "dash.info.personal" },
          { kind: "item", id: "odeme", labelKey: "dash.info.pay" },
          { kind: "item", id: "hareketler", labelKey: "dash.info.tx" },
          { kind: "item", id: "iptal", labelKey: "dash.info.cancel" },
        ],
      },
      {
        kind: "group",
        id: "sec",
        labelKey: "dash.g.sec",
        children: [
          { kind: "item", id: "guvenlik", labelKey: "acct.sec.overview" },
          { kind: "item", id: "sifre", labelKey: "dash.sec.pass" },
          { kind: "item", id: "iki-asama", labelKey: "acct.2fa.h" },
          { kind: "item", id: "engellenenler", labelKey: "acct.blocks.h" },
          { kind: "item", id: "cihazlar", labelKey: "dash.sec.devices" },
        ],
      },
      {
        kind: "group",
        id: "app",
        labelKey: "dash.g.app",
        children: [
          { kind: "item", id: "bildirim-ayarlari", labelKey: "dash.app.notif" },
          { kind: "item", id: "okundu", labelKey: "dash.app.read" },
          { kind: "item", id: "pazarlama", labelKey: "dash.app.mkt" },
          { kind: "item", id: "hareket", labelKey: "acct.motion.h" },
        ],
      },
      { kind: "item", id: "qr", labelKey: "acct.qr.h" },
      { kind: "link", id: "marka-kiti", href: "/marka-kiti", labelKey: "brandkit.nav" },
    ],
  },
];

export const DASH_NAV: DashNode[] = pruneHidden(FULL_DASH_NAV);

export function isDashPanel(value: string | null | undefined): value is DashPanelId {
  return !!value && (DASH_PANELS as readonly string[]).includes(value) && !isPanelHidden(value as DashPanelId);
}

export function panelFromSearch(raw: string | null, fallback: DashPanelId = "ozet"): DashPanelId {
  if (isDashPanel(raw)) return raw;
  return fallback;
}

export function dashHref(id: DashPanelId) {
  return `/profil?p=${id}`;
}

export function groupContains(node: DashNode, panel: DashPanelId): boolean {
  if (node.kind === "item") return node.id === panel;
  if (node.kind === "link") return false;
  return node.children.some((c) => groupContains(c, panel));
}

export function ancestorGroupIds(panel: DashPanelId, nodes: DashNode[] = DASH_NAV, trail: string[] = []): string[] {
  for (const n of nodes) {
    if (n.kind === "item" && n.id === panel) return trail;
    if (n.kind === "group") {
      const found = ancestorGroupIds(panel, n.children, [...trail, n.id]);
      if (found.length) return found;
    }
  }
  return [];
}
