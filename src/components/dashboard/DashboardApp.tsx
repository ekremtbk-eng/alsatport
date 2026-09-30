"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BadgeInfo,
  Bell,
  BellRing,
  Bookmark,
  ChevronDown,
  CreditCard,
  Eye,
  Handshake,
  Heart,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  List,
  Lock,
  Mail,
  Menu,
  MessageCircle,
  Receipt,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  User,
  UserRound,
  UserX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import {
  DASH_NAV,
  ancestorGroupIds,
  dashHref,
  groupContains,
  panelFromSearch,
  type DashNode,
  type DashPanelId,
} from "@/lib/dashboardNav";
import { DashboardPanel } from "./DashboardPanels";

const DASH_ICONS: Record<string, LucideIcon> = {
  ozet: LayoutDashboard,
  ilan: List,
  ilanlarim: List,
  fav: Heart,
  "fav-ilan": Heart,
  "fav-arama": Bookmark,
  "fav-satici": Store,
  msg: MessageCircle,
  mesajlar: MessageCircle,
  "soru-cevap": HelpCircle,
  teklifler: Handshake,
  shop: ShoppingBag,
  sparam: Wallet,
  eticaret: ShoppingCart,
  guvenli: Shield,
  bildirimler: Bell,
  account: UserRound,
  info: BadgeInfo,
  kisisel: User,
  odeme: CreditCard,
  hareketler: Receipt,
  iptal: UserX,
  sec: Lock,
  sifre: KeyRound,
  cihazlar: Smartphone,
  app: Settings,
  "bildirim-ayarlari": BellRing,
  okundu: Eye,
  pazarlama: Mail,
};

function DashIcon({ id }: { id: string }) {
  const Icon = DASH_ICONS[id];
  if (!Icon) return null;
  return <Icon className="dash-nav-ico" strokeWidth={1.85} />;
}

export function DashboardApp({ initialPanel }: { initialPanel?: DashPanelId }) {
  const { user } = useApp();
  const { t } = useI18n();
  const search = useSearchParams();
  const fallback = initialPanel ?? "ozet";
  const [panel, setPanel] = useState<DashPanelId>(() => panelFromSearch(search.get("p"), fallback));
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPanel(panelFromSearch(search.get("p"), fallback));
  }, [search, fallback]);

  useEffect(() => {
    function onPop() {
      const p = new URLSearchParams(window.location.search).get("p");
      setPanel(panelFromSearch(p));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((id: DashPanelId) => {
    setPanel(id);
    setOpen(false);
    window.history.pushState({ dash: id }, "", dashHref(id));
  }, []);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">{t("dash.h")}</h1>
        <p className="mt-2 text-sm text-muted">{t("auth.login.p")}</p>
        <Link href="/giris?next=/profil" className="btn-primary mt-6 inline-flex h-12 px-6">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="dash-layout">
        <button type="button" className="dash-menu-toggle" onClick={() => setOpen((v) => !v)}>
          <Menu className="h-4 w-4" />
          {t("dash.menu")}
        </button>
        <aside className={`dash-nav ${open ? "is-open" : ""}`}>
          <DashTree
            nodes={DASH_NAV}
            panel={panel}
            go={go}
            t={t}
            collapsed={collapsed}
            toggle={(id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
          />
        </aside>
        <section className="dash-content" aria-live="polite">
          <DashboardPanel panel={panel} />
        </section>
      </div>
    </div>
  );
}

function DashTree({
  nodes,
  panel,
  go,
  t,
  depth = 0,
  collapsed,
  toggle,
}: {
  nodes: DashNode[];
  panel: DashPanelId;
  go: (id: DashPanelId) => void;
  t: (k: string) => string;
  depth?: number;
  collapsed: Record<string, boolean>;
  toggle: (id: string) => void;
}) {
  const activeTrail = ancestorGroupIds(panel);
  return (
    <ul className={depth === 0 ? "dash-nav-list" : "dash-nav-sub"}>
      {nodes.map((node) => {
        if (node.kind === "item") {
          const active = panel === node.id;
          return (
            <li key={node.id}>
              <button
                type="button"
                className={`dash-nav-item depth-${depth} ${active ? "is-active" : ""}`}
                onClick={() => go(node.id)}
              >
                <DashIcon id={node.id} />
                <span className="dash-nav-item-label">{t(node.labelKey)}</span>
              </button>
            </li>
          );
        }
        const isCollapsed = collapsed[node.id] === true;
        const inPath = groupContains(node, panel) || activeTrail.includes(node.id);
        return (
          <li key={node.id}>
            <button
              type="button"
              className={`dash-nav-group depth-${depth} ${inPath ? "is-current" : ""}`}
              onClick={() => toggle(node.id)}
            >
              <DashIcon id={node.id} />
              <span className="dash-nav-group-label">{t(node.labelKey)}</span>
              <ChevronDown className={`dash-nav-chev ${isCollapsed ? "" : "is-open"}`} strokeWidth={2} />
            </button>
            {isCollapsed ? null : (
              <DashTree
                nodes={node.children}
                panel={panel}
                go={go}
                t={t}
                depth={depth + 1}
                collapsed={collapsed}
                toggle={toggle}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
