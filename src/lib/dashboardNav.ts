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
  "sifre",
  "cihazlar",
  "bildirim-ayarlari",
  "okundu",
  "pazarlama",
] as const;

export type DashPanelId = (typeof DASH_PANELS)[number];

export type DashNode =
  | { kind: "item"; id: DashPanelId; labelKey: string }
  | { kind: "group"; id: string; labelKey: string; children: DashNode[] };

export const DASH_NAV: DashNode[] = [
  { kind: "item", id: "ozet", labelKey: "dash.ozet" },
  {
    kind: "group",
    id: "ilan",
    labelKey: "dash.g.ilan",
    children: [{ kind: "item", id: "ilanlarim", labelKey: "dash.ilanlarim" }],
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
          { kind: "item", id: "sifre", labelKey: "dash.sec.pass" },
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
        ],
      },
    ],
  },
];

export function isDashPanel(value: string | null | undefined): value is DashPanelId {
  return !!value && (DASH_PANELS as readonly string[]).includes(value);
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
