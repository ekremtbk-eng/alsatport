"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Check,
  CreditCard,
  Heart,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { ListingGrid } from "@/components/ListingGrid";
import { SearchSelect } from "@/components/SearchSelect";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { isPublicListing } from "@/lib/categoryCounts";
import type { DashPanelId } from "@/lib/dashboardNav";
import { formatNotifTime, listingMatchesSearch, searchHref, searchLabel, type NotifKind } from "@/lib/notify";
import { NUMBER_LOCALE } from "@/i18n/config";
import {
  isEmailVerified,
  isProfileComplete,
  isValidFullName,
  isValidIdentityNo,
  isValidOpenAddress,
  isValidPhone,
  profileGaps,
  safeNextPath,
  postListingHref,
} from "@/lib/profile";
import { apiPost } from "@/lib/security/client";
import { TURKEY_CITIES } from "@/data/turkey";
import { passwordChecks } from "@/lib/security/passwordPolicy";
import { AvatarUploader } from "@/components/AvatarUploader";
import { EntitlementStatus } from "@/components/EntitlementStatus";
import { paymentsPaused } from "@/lib/campaign";

const KIND: Record<NotifKind, { icon: typeof Bell; key: string }> = {
  price: { icon: Bell, key: "notif.kind.price" },
  search: { icon: Search, key: "notif.kind.search" },
  nearby: { icon: MapPin, key: "notif.kind.nearby" },
  system: { icon: Bell, key: "notif.kind.system" },
};

function titleFor(kind: NotifKind, fallback: string, t: (k: string) => string) {
  const key = `notif.t.${kind}`;
  const v = t(key);
  return v === key ? fallback : v;
}

const PREFS_KEY = "alsatport-dash-prefs-v1";

type DashPrefs = { readReceipts: boolean; marketingEmail: boolean; marketingSms: boolean; marketingPush: boolean };

function loadPrefs(): DashPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<DashPrefs>;
    return {
      readReceipts: raw.readReceipts !== false,
      marketingEmail: !!raw.marketingEmail,
      marketingSms: !!raw.marketingSms,
      marketingPush: raw.marketingPush !== false,
    };
  } catch {
    return { readReceipts: true, marketingEmail: false, marketingSms: false, marketingPush: true };
  }
}

export function DashboardPanel({ panel }: { panel: DashPanelId }) {
  switch (panel) {
    case "ozet":
      return <OzetPanel />;
    case "ilanlarim":
      return <ListingsPanel />;
    case "fav-ilan":
      return <FavAdsPanel />;
    case "fav-arama":
      return <FavSearchPanel />;
    case "fav-satici":
      return <FavSellersPanel />;
    case "mesajlar":
      return <MessagesPanel />;
    case "soru-cevap":
      return <EmptyPanel titleKey="dash.qa" bodyKey="dash.qa.empty" />;
    case "teklifler":
      return <EmptyPanel titleKey="dash.offers" bodyKey="dash.offers.empty" />;
    case "sparam":
      return <SParamPanel />;
    case "eticaret":
      return <EmptyPanel titleKey="dash.ecom" bodyKey="dash.ecom.empty" />;
    case "guvenli":
      return <EmptyPanel titleKey="dash.safe" bodyKey="dash.safe.empty" />;
    case "bildirimler":
      return <NotifsPanel />;
    case "kisisel":
      return <PersonalPanel />;
    case "odeme":
      return <PayInfoPanel />;
    case "hareketler":
      return <TxPanel />;
    case "iptal":
      return <CancelPanel />;
    case "sifre":
      return <PasswordPanel />;
    case "cihazlar":
      return <DevicesPanel />;
    case "bildirim-ayarlari":
      return <NotifPrefsPanel />;
    case "okundu":
      return <ReadReceiptPanel />;
    case "pazarlama":
      return <MarketingPanel />;
    default:
      return <OzetPanel />;
  }
}

function Pane({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="dash-pane-title">{title}</h1>
      {children}
    </div>
  );
}

function EmptyPanel({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { t } = useI18n();
  return (
    <Pane title={t(titleKey)}>
      <p className="dash-empty">{t(bodyKey)}</p>
    </Pane>
  );
}

function OzetPanel() {
  const { user, listings, favorites, conversations, notifications } = useApp();
  const { t, formatMoney } = useI18n();
  if (!user) return null;
  const mine = listings.filter((l) => l.sellerId === user.id);
  const live = mine.filter((l) => l.status === "active");
  const unread = conversations.reduce((a, c) => a + c.unread, 0);
  const unreadN = notifications.filter((n) => !n.read).length;
  return (
    <Pane title={t("dash.ozet")}>
      <div className="dash-stats">
        <div className="dash-stat">
          <LayoutDashboard className="dash-stat-ico" strokeWidth={1.8} />
          <b>{live.length}</b>
          <span>{t("my.active")}</span>
        </div>
        <div className="dash-stat">
          <Heart className="dash-stat-ico" strokeWidth={1.8} />
          <b>{favorites.length}</b>
          <span>{t("dash.fav.ilan")}</span>
        </div>
        <div className="dash-stat">
          <MessageCircle className="dash-stat-ico" strokeWidth={1.8} />
          <b>{unread}</b>
          <span>{t("dash.msg")}</span>
        </div>
        <div className="dash-stat">
          <Bell className="dash-stat-ico" strokeWidth={1.8} />
          <b>{unreadN}</b>
          <span>{t("dash.notifs")}</span>
        </div>
      </div>
      <EntitlementStatus compact />
      <div className="dash-summary-card">
        <p className="text-sm text-muted">
          {user.verified ? t("bilgi.tickOn") : t("bilgi.tickOff")}
        </p>
        {live[0] ? (
          <p className="mt-3 text-sm">
            {t("dash.lastAd")}: {live[0].title} — {formatMoney(live[0].price)}
          </p>
        ) : null}
      </div>
    </Pane>
  );
}

function ListingsPanel() {
  const { user, listings, setListingStatus, removeListing, renewListing } = useApp();
  const { formatMoney, t } = useI18n();
  const [tab, setTab] = useState<"active" | "passive" | "pending">("active");
  if (!user) return null;
  const mine = listings.filter((l) => {
    if (l.sellerId !== user.id) return false;
    if (tab === "pending") return l.status === "pending";
    if (tab === "active") return l.status === "active";
    return l.status === "passive" || l.status === "rejected";
  });
  return (
    <Pane title={t("dash.ilanlarim")}>
      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setTab("active")} className={`chip ${tab === "active" ? "chip-on" : ""}`}>
          {t("my.active")}
        </button>
        <button type="button" onClick={() => setTab("pending")} className={`chip ${tab === "pending" ? "chip-on" : ""}`}>
          {t("my.pending")}
        </button>
        <button type="button" onClick={() => setTab("passive")} className={`chip ${tab === "passive" ? "chip-on" : ""}`}>
          {t("my.passive")}
        </button>
      </div>
      <div className="space-y-2">
        {mine.map((l) => (
          <div key={l.id} className="flex gap-3 rounded-xl border border-line bg-card p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.images[0]} alt="" className="h-20 w-24 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <Link href={`/ilan/${l.id}`} className="font-semibold">
                {l.title} {l.subtitle}
              </Link>
              <p className="price-text text-sm font-bold">{formatMoney(l.price)}</p>
              <p className="text-xs text-muted">
                {l.views} {t("my.views")} · {l.city}
                {l.expiresAt ? ` · ${t("quota.until", { date: new Date(l.expiresAt).toLocaleDateString("tr-TR") })}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => {
                  if (tab === "passive" && l.expiresAt && l.expiresAt <= Date.now()) {
                    void renewListing(l.id);
                    return;
                  }
                  setListingStatus(l.id, tab === "active" ? "passive" : "active");
                }}
                className="self-start rounded-full bg-lime/15 px-2 py-0.5 text-[10px] font-bold text-lime"
              >
                {tab === "active" ? t("my.activeChip") : t("my.passiveChip")}
              </button>
              {l.expiresAt ? (
                <button
                  type="button"
                  onClick={() => void renewListing(l.id)}
                  className="self-start rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-bold text-blue"
                >
                  {t("quota.renew")}
                </button>
              ) : null}
              <Link
                href={`/ilan-ver?edit=${l.id}`}
                className="rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-bold text-blue"
              >
                {t("common.edit")}
              </Link>
              <button
                type="button"
                onClick={() => removeListing(l.id)}
                className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold text-orange"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}
        {mine.length === 0 ? (
          <p className="dash-empty">{tab === "active" ? t("my.empty.a") : t("my.empty.p")}</p>
        ) : null}
      </div>
    </Pane>
  );
}

function FavAdsPanel() {
  const { listings, favorites } = useApp();
  const { t } = useI18n();
  const items = listings.filter((l) => favorites.includes(l.id) && isPublicListing(l));
  return (
    <Pane title={t("dash.fav.ilan")}>
      {items.length === 0 ? (
        <p className="dash-empty">
          {t("fav.empty")}{" "}
          <Link href="/" className="text-blue">
            {t("go.home")}
          </Link>
        </p>
      ) : (
        <ListingGrid>
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </ListingGrid>
      )}
    </Pane>
  );
}

function FavSearchPanel() {
  const { listings, savedSearches, removeSavedSearch } = useApp();
  const { t } = useI18n();
  return (
    <Pane title={t("dash.fav.arama")}>
      {savedSearches.length === 0 ? (
        <p className="dash-empty">{t("fav.emptySearch")}</p>
      ) : (
        <ul className="space-y-2">
          {savedSearches.map((s) => {
            const n = listings.filter((l) => listingMatchesSearch(l, s)).length;
            return (
              <li key={s.id} className="flex items-center gap-3 border-b border-line py-3">
                <Search className="h-4 w-4 text-muted" />
                <div className="min-w-0 flex-1">
                  <Link href={searchHref(s)} className="font-semibold hover:text-blue">
                    {searchLabel(s)}
                  </Link>
                  <p className="text-xs text-muted">{t("fav.match", { n })}</p>
                </div>
                <button type="button" className="dash-link" onClick={() => removeSavedSearch(s.id)}>
                  {t("common.delete")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Pane>
  );
}

function FavSellersPanel() {
  const { listings, favorites } = useApp();
  const { t } = useI18n();
  const sellers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar?: string; n: number }>();
    for (const l of listings) {
      if (!favorites.includes(l.id)) continue;
      const cur = map.get(l.sellerId);
      if (cur) cur.n += 1;
      else map.set(l.sellerId, { id: l.sellerId, name: l.sellerName, avatar: l.images[0], n: 1 });
    }
    return [...map.values()];
  }, [listings, favorites]);
  return (
    <Pane title={t("dash.fav.satici")}>
      {sellers.length === 0 ? (
        <p className="dash-empty">{t("dash.fav.satici.empty")}</p>
      ) : (
        <ul>
          {sellers.map((s) => (
            <li key={s.id} className="dash-info-row">
              <div>
                <p className="dash-row-label">{t("dash.seller")}</p>
                <Link href={`/satici/${s.id}`} className="font-semibold">
                  {s.name}
                </Link>
                <p className="text-xs text-muted">{t("fav.match", { n: s.n })}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Pane>
  );
}

function MessagesPanel() {
  const { conversations } = useApp();
  const { t } = useI18n();
  const [tab, setTab] = useState<"all" | "unread" | "fav">("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    let c = conversations;
    if (tab === "unread") c = c.filter((x) => x.unread > 0);
    if (tab === "fav") c = c.filter((x) => x.favorite);
    if (q) c = c.filter((x) => x.peerName.toLowerCase().includes(q.toLowerCase()));
    return c;
  }, [conversations, tab, q]);
  return (
    <Pane title={t("dash.msg")}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("msg.search")}
        className="mb-3 h-11 w-full rounded-xl border border-line bg-elev px-3 text-sm"
      />
      <div className="mb-3 flex gap-2">
        {[
          { id: "all" as const, label: t("cat.all") },
          { id: "unread" as const, label: t("msg.unread", { n: conversations.filter((c) => c.unread).length }) },
          { id: "fav" as const, label: t("msg.fav") },
        ].map((x) => (
          <button key={x.id} type="button" onClick={() => setTab(x.id)} className={`chip ${tab === x.id ? "chip-on" : ""}`}>
            {x.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="dash-empty">{t("chat.none")}</p>
      ) : (
        <ul>
          {list.map((c) => (
            <li key={c.id} className="dash-info-row">
              <Link href={`/mesajlar/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.peerAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="font-semibold">{c.peerName}</p>
                  <p className="truncate text-sm text-muted">{c.lastMessage}</p>
                </div>
              </Link>
              {c.unread > 0 ? <span className="badge-vip rounded-full px-2 text-[10px]">{c.unread}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </Pane>
  );
}

function SParamPanel() {
  const { t, formatMoney } = useI18n();
  return (
    <Pane title={t("dash.sparam")}>
      <div className="dash-summary-card">
        <p className="dash-row-label">{t("dash.sparam.bal")}</p>
        <p className="text-2xl font-extrabold">{formatMoney(0)}</p>
        <p className="mt-2 text-sm text-muted">{t("dash.sparam.p")}</p>
      </div>
    </Pane>
  );
}

function NotifsPanel() {
  const { notifications, markNotificationRead, markAllNotificationsRead, clearNotifications } = useApp();
  const { t, locale } = useI18n();
  return (
    <Pane title={t("dash.notifs")}>
      <div className="mb-3 flex gap-2">
        <button type="button" className="chip" onClick={markAllNotificationsRead}>
          {t("notif.read")}
        </button>
        <button type="button" className="chip" onClick={clearNotifications}>
          {t("notif.clear")}
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className="dash-empty">{t("notif.boxEmpty")}</p>
      ) : (
        <ul>
          {notifications.map((n) => {
            const meta = KIND[n.kind];
            const Icon = meta.icon;
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => markNotificationRead(n.id)}
                  className={`dash-info-row ${n.read ? "opacity-70" : ""}`}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2">
                      <span className="font-semibold">{titleFor(n.kind, n.title, t)}</span>
                      <span className="text-[10px] text-muted">{formatNotifTime(n.createdAt, NUMBER_LOCALE[locale])}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{n.body}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Pane>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs font-semibold text-orange">{msg}</p>;
}

function PersonalPanel() {
  const { user, completeProfile, startEmailVerify, startPhoneVerify, confirmPhoneVerify } = useApp();
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const [edit, setEdit] = useState<"none" | "name" | "display" | "phone" | "email" | "identity" | "address">("none");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [nationalId, setNationalId] = useState(user?.nationalId ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [error, setError] = useState("");
  const [fieldErr, setFieldErr] = useState<{ name?: string; phone?: string; id?: string; address?: string }>({});
  const [hint, setHint] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName ?? "");
    setDisplayName(user.displayName ?? "");
    setPhone(user.phone ?? "");
    setNationalId(user.nationalId ?? "");
    setAddress(user.address ?? "");
  }, [user]);

  if (!user) return null;
  const verified = user.verified && isProfileComplete(user);
  const gaps = profileGaps(user);
  const showRequiredForm = gaps.some((g) => g === "name" || g === "identity" || g === "phone" || g === "address");

  function afterSave(needsProfile?: boolean) {
    setHint(t("bilgi.saved"));
    setEdit("none");
    setFieldErr({});
    const next = search.get("next");
    if (!needsProfile && next) router.push(safeNextPath(next));
  }

  async function persist(patch: {
    fullName: string;
    phone: string;
    nationalId: string;
    address: string;
    displayName?: string;
  }) {
    setBusy(true);
    const res = await completeProfile(patch);
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return false;
    }
    afterSave(res.needsProfile);
    return true;
  }

  async function saveRequired() {
    setError("");
    const nextErr: typeof fieldErr = {};
    if (!isValidFullName(fullName)) nextErr.name = t("complete.err.name");
    if (!isValidPhone(phone)) nextErr.phone = t("complete.err.phone");
    if (!isValidIdentityNo(nationalId)) nextErr.id = t("complete.err.id");
    if (!isValidOpenAddress(address)) nextErr.address = t("complete.err.address");
    setFieldErr(nextErr);
    if (nextErr.name || nextErr.phone || nextErr.id || nextErr.address) return;
    await persist({ fullName, phone, nationalId, address, displayName });
  }

  async function saveName() {
    setError("");
    if (!isValidFullName(fullName)) {
      setFieldErr({ name: t("complete.err.name") });
      return;
    }
    setFieldErr({});
    await persist({
      fullName,
      phone: user!.phone ?? "",
      nationalId: user!.nationalId ?? "",
      address: user!.address ?? "",
      displayName,
    });
  }

  async function savePhone() {
    setError("");
    if (!isValidPhone(phone)) {
      setFieldErr({ phone: t("complete.err.phone") });
      return;
    }
    setFieldErr({});
    await persist({
      fullName: user!.fullName ?? "",
      phone,
      nationalId: user!.nationalId ?? "",
      address: user!.address ?? "",
      displayName,
    });
  }

  async function saveIdentity() {
    setError("");
    if (!isValidIdentityNo(nationalId)) {
      setFieldErr({ id: t("complete.err.id") });
      return;
    }
    setFieldErr({});
    await persist({
      fullName: user!.fullName ?? "",
      phone: user!.phone ?? "",
      nationalId,
      address: user!.address ?? "",
      displayName,
    });
  }

  async function saveAddress() {
    setError("");
    if (!isValidOpenAddress(address)) {
      setFieldErr({ address: t("complete.err.address") });
      return;
    }
    setFieldErr({});
    await persist({
      fullName: user!.fullName ?? "",
      phone: user!.phone ?? "",
      nationalId: user!.nationalId ?? "",
      address,
      displayName,
    });
  }

  async function saveDisplay() {
    setError("");
    const name = displayName.trim();
    if (name.length < 2) {
      setError(t("dash.display.err"));
      return;
    }
    await persist({
      fullName: user!.fullName ?? "",
      phone: user!.phone ?? "",
      nationalId: user!.nationalId ?? "",
      address: user!.address ?? "",
      displayName: name,
    });
  }

  async function sendEmailCode() {
    setBusy(true);
    setError("");
    const res = await startEmailVerify();
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    if (res.already) {
      setHint(t("bilgi.emailOk"));
      return;
    }
    setHint(t("bilgi.emailSent"));
  }

  async function sendPhoneCode() {
    setBusy(true);
    setError("");
    const res = await startPhoneVerify();
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    if (res.already) {
      setHint(t("bilgi.phoneOk"));
      return;
    }
    setPhoneCode(res.sandboxCode ?? "");
    setHint(t("bilgi.phoneSent"));
  }

  async function confirmPhone() {
    setBusy(true);
    setError("");
    const res = await confirmPhoneVerify(phoneOtp);
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "complete.err.emailCode"));
      return;
    }
    setHint(t("bilgi.phoneOk"));
    setPhoneCode("");
    setPhoneOtp("");
  }

  return (
    <Pane title={t("dash.info.personal")}>
      <div>
        <AvatarUploader />
        {verified ? (
          <div className="mt-1 flex justify-center">
            <VerifiedBadge size={18} />
          </div>
        ) : null}
      </div>

      {showRequiredForm ? (
        <div className="dash-inline-form mb-4">
          <p className="text-sm font-extrabold">{t("complete.h")}</p>
          <p className="text-xs text-muted">{t("bilgi.p")}</p>
          <label className="block" htmlFor="profile-fullname">
            <span className="dash-row-label">{t("complete.name")}</span>
            <input
              id="profile-fullname"
              name="fullName"
              autoComplete="name"
              className="dash-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <FieldError msg={fieldErr.name} />
          </label>
          <label className="block" htmlFor="profile-phone">
            <span className="dash-row-label">{t("complete.phone")}</span>
            <input
              id="profile-phone"
              name="phone"
              autoComplete="tel"
              inputMode="numeric"
              maxLength={11}
              className="dash-input"
              value={phone}
              placeholder={t("complete.phonePh")}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
            />
            <p className="mt-1 text-[11px] text-muted">{t("complete.phoneHint")}</p>
            <FieldError msg={fieldErr.phone} />
          </label>
          <label className="block" htmlFor="profile-national-id">
            <span className="dash-row-label">{t("complete.id")}</span>
            <input
              id="profile-national-id"
              name="nationalId"
              autoComplete="off"
              inputMode="numeric"
              maxLength={11}
              className="dash-input"
              value={nationalId}
              placeholder={t("complete.idph")}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 11))}
            />
            <FieldError msg={fieldErr.id} />
          </label>
          <label className="block" htmlFor="profile-address">
            <span className="dash-row-label">{t("bilgi.address")}</span>
            <textarea
              id="profile-address"
              name="address"
              autoComplete="street-address"
              className="dash-input min-h-20"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <FieldError msg={fieldErr.address} />
          </label>
          <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy} onClick={() => void saveRequired()}>
            {t("complete.save")}
          </button>
        </div>
      ) : null}

      <InfoRow label={t("dash.username")} value={user.username} />
      <InfoRow
        label={t("dash.fullname")}
        value={user.fullName || "—"}
        action={t("dash.update")}
        onAction={() => setEdit(edit === "name" ? "none" : "name")}
      />
      {edit === "name" ? (
        <div className="dash-inline-form">
          <label className="block" htmlFor="profile-edit-name">
            <span className="dash-row-label">{t("complete.name")}</span>
            <input
              id="profile-edit-name"
              name="fullName"
              autoComplete="name"
              className="dash-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <FieldError msg={fieldErr.name} />
          </label>
          <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy} onClick={() => void saveName()}>
            {t("complete.save")}
          </button>
        </div>
      ) : null}

      <InfoRow
        label={t("dash.display")}
        value={user.displayName}
        action={t("dash.display.update")}
        onAction={() => setEdit(edit === "display" ? "none" : "display")}
      />
      {edit === "display" ? (
        <div className="dash-inline-form">
          <input className="dash-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy} onClick={() => void saveDisplay()}>
            {t("complete.save")}
          </button>
        </div>
      ) : null}

      <InfoRow
        label={t("dash.phone")}
        value={user.phone ? (user.phoneVerified ? t("dash.phone.verified") : t("dash.phone.on")) : t("dash.phone.off")}
        action={user.phone ? t("dash.update") : t("dash.phone.add")}
        onAction={() => setEdit(edit === "phone" ? "none" : "phone")}
      />
      {edit === "phone" ? (
        <div className="dash-inline-form">
          <label className="block" htmlFor="profile-edit-phone">
            <span className="mb-1 flex items-center gap-1.5 text-sm">
              <Phone className="h-3.5 w-3.5 text-lime" /> {t("complete.phone")}
            </span>
            <input
              id="profile-edit-phone"
              name="phone"
              autoComplete="tel"
              inputMode="numeric"
              maxLength={11}
              className="dash-input"
              value={phone}
              placeholder={t("complete.phonePh")}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
            />
            <p className="mt-1 text-[11px] text-muted">{t("complete.phoneHint")}</p>
            <FieldError msg={fieldErr.phone} />
          </label>
          <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy} onClick={() => void savePhone()}>
            {t("complete.save")}
          </button>
          {user.phone && !user.phoneVerified ? (
            <>
              <button type="button" className="btn-blue h-10 px-4 text-sm" disabled={busy} onClick={() => void sendPhoneCode()}>
                {t("bilgi.sendPhoneCode")}
              </button>
              {phoneCode ? (
                <p className="rounded-xl bg-elev px-3 py-2 text-xs">
                  {t("bilgi.inbox")}: <span className="font-extrabold tracking-widest">{phoneCode}</span>
                </p>
              ) : null}
              <input
                className="dash-input text-center tracking-[0.4em]"
                inputMode="numeric"
                maxLength={6}
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <button
                type="button"
                className="btn-primary h-10 px-4 text-sm"
                disabled={busy || phoneOtp.length !== 6}
                onClick={() => void confirmPhone()}
              >
                {t("bilgi.confirmPhone")}
              </button>
            </>
          ) : user.phoneVerified ? (
            <p className="text-sm font-semibold text-lime">{t("bilgi.phoneOk")}</p>
          ) : null}
        </div>
      ) : null}

      <InfoRow
        label={t("complete.id")}
        value={user.nationalId || "—"}
        action={t("dash.update")}
        onAction={() => setEdit(edit === "identity" ? "none" : "identity")}
      />
      {edit === "identity" ? (
        <div className="dash-inline-form">
          <label className="block" htmlFor="profile-edit-id">
            <span className="dash-row-label">{t("complete.id")}</span>
            <input
              id="profile-edit-id"
              name="nationalId"
              autoComplete="off"
              inputMode="numeric"
              maxLength={11}
              className="dash-input"
              value={nationalId}
              placeholder={t("complete.idph")}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 11))}
            />
            <FieldError msg={fieldErr.id} />
          </label>
          <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy} onClick={() => void saveIdentity()}>
            {t("complete.save")}
          </button>
        </div>
      ) : null}

      <InfoRow
        label={t("bilgi.address")}
        value={user.address || "—"}
        action={t("dash.update")}
        onAction={() => setEdit(edit === "address" ? "none" : "address")}
      />
      {edit === "address" ? (
        <div className="dash-inline-form">
          <label className="block" htmlFor="profile-edit-address">
            <span className="dash-row-label">{t("bilgi.address")}</span>
            <textarea
              id="profile-edit-address"
              name="address"
              className="dash-input min-h-20"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <FieldError msg={fieldErr.address} />
          </label>
          <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy} onClick={() => void saveAddress()}>
            {t("complete.save")}
          </button>
        </div>
      ) : null}

      <InfoRow
        label={t("dash.email")}
        value={user.email ?? "—"}
        action={t("dash.email.change")}
        onAction={() => setEdit(edit === "email" ? "none" : "email")}
      />
      {edit === "email" ? (
        <div className="dash-inline-form">
          <p className="flex items-center gap-1.5 text-sm">
            <Mail className="h-4 w-4 text-lime" /> {user.email}
          </p>
          {isEmailVerified(user) ? (
            <p className="text-sm font-semibold text-lime">{t("bilgi.emailOk")}</p>
          ) : (
            <>
              <button type="button" className="btn-blue h-10 px-4 text-sm" disabled={busy} onClick={() => void sendEmailCode()}>
                {t("bilgi.sendLink")}
              </button>
            </>
          )}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs font-semibold text-orange">{error}</p> : null}
      {hint ? <p className="mt-3 text-xs font-semibold text-lime">{hint}</p> : null}

      <p className="dash-kvkk">
        {t("dash.kvkk")}{" "}
        <Link href="/kvkk" className="dash-link">
          {t("dash.kvkk.here")}
        </Link>
        .
      </p>

      <ul className="mt-4 space-y-1 text-xs text-muted">
        {(
          [
            ["name", t("complete.name")],
            ["identity", t("complete.id")],
            ["phone", t("complete.phone")],
            ["email", t("bilgi.email")],
            ["address", t("bilgi.address")],
          ] as const
        ).map(([key, label]) => (
          <li key={key} className="flex items-center gap-2">
            <Check className={`h-3.5 w-3.5 ${gaps.includes(key) ? "text-orange" : "text-lime"}`} />
            {label}
          </li>
        ))}
      </ul>
      {verified ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-blue" /> {t("bilgi.tickOn")}
        </p>
      ) : null}
    </Pane>
  );
}

function InfoRow({
  label,
  value,
  action,
  onAction,
}: {
  label: string;
  value: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="dash-info-row">
      <div>
        <p className="dash-row-label">{label}</p>
        <p className="text-sm text-ink">{value}</p>
      </div>
      {action ? (
        <button type="button" className="dash-link shrink-0" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

function PayInfoPanel() {
  const { user } = useApp();
  const { t } = useI18n();
  const campaign = paymentsPaused();
  return (
    <Pane title={t("dash.info.pay")}>
      <EntitlementStatus compact />
      <p className="mt-3 text-sm text-muted">{t("dash.pay.p")}</p>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-line px-4 py-4">
        <CreditCard className="h-5 w-5 text-muted" />
        <p className="text-sm">{campaign ? t("pay.campaign") : t("dash.pay.none")}</p>
      </div>
      <Link href={campaign ? postListingHref(user) : "/paketler"} className="btn-primary mt-4 inline-flex h-11 px-5">
        {campaign ? t("post.h") : t("footer.packages")}
      </Link>
    </Pane>
  );
}

function TxPanel() {
  const { user } = useApp();
  const { t } = useI18n();
  return (
    <Pane title={t("dash.info.tx")}>
      {user ? <EntitlementStatus compact /> : null}
      <p className="dash-empty mt-4">{t("dash.tx.empty")}</p>
    </Pane>
  );
}

function CancelPanel() {
  const { logout } = useApp();
  const { t } = useI18n();
  const [ok, setOk] = useState(false);
  return (
    <Pane title={t("dash.info.cancel")}>
      <p className="text-sm text-muted">{t("dash.cancel.p")}</p>
      <label className="mt-4 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1" />
        {t("dash.cancel.ack")}
      </label>
      <button
        type="button"
        disabled={!ok}
        className="btn-orange mt-4 h-11 px-5 disabled:opacity-40"
        onClick={() => {
          logout();
          window.location.href = "/welcome";
        }}
      >
        {t("dash.cancel.go")}
      </button>
    </Pane>
  );
}

function PasswordPanel() {
  const { user } = useApp();
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const checks = passwordChecks(next);
  const oauth = user?.authProvider && user.authProvider !== "email";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== again) {
      setError(t("dash.pw.match"));
      return;
    }
    setBusy(true);
    const res = await apiPost<{ ok: boolean; error?: string }>("/api/account/password", { current, next });
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setHint(t("dash.pw.ok"));
    setCurrent("");
    setNext("");
    setAgain("");
  }

  return (
    <Pane title={t("dash.sec.pass")}>
      {oauth ? (
        <p className="dash-empty">{t("dash.pw.oauth")}</p>
      ) : (
        <form className="max-w-md space-y-3" onSubmit={(e) => void submit(e)}>
          <label className="block">
            <span className="dash-row-label">{t("dash.pw.current")}</span>
            <input type="password" className="dash-input" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </label>
          <label className="block">
            <span className="dash-row-label">{t("dash.pw.next")}</span>
            <input type="password" className="dash-input" value={next} onChange={(e) => setNext(e.target.value)} required />
          </label>
          <ul className="text-xs text-muted">
            {checks.map((c) => (
              <li key={c.id} className={c.ok ? "text-lime" : ""}>
                {t(`dash.pw.${c.id}`)}
              </li>
            ))}
          </ul>
          <label className="block">
            <span className="dash-row-label">{t("dash.pw.again")}</span>
            <input type="password" className="dash-input" value={again} onChange={(e) => setAgain(e.target.value)} required />
          </label>
          {error ? <p className="text-xs font-semibold text-orange">{error}</p> : null}
          {hint ? <p className="text-xs font-semibold text-lime">{hint}</p> : null}
          <button className="btn-primary h-11 px-5" disabled={busy}>
            {t("complete.save")}
          </button>
        </form>
      )}
    </Pane>
  );
}

function DevicesPanel() {
  const { t } = useI18n();
  const [ua, setUa] = useState("");
  useEffect(() => {
    setUa(navigator.userAgent);
  }, []);
  return (
    <Pane title={t("dash.sec.devices")}>
      <div className="dash-info-row">
        <div>
          <p className="dash-row-label">{t("dash.device.this")}</p>
          <p className="text-sm">{t("dash.device.active")}</p>
          <p className="mt-1 text-xs text-muted break-all">{ua}</p>
        </div>
      </div>
    </Pane>
  );
}

function ToggleRow({ title, desc, on, onChange }: { title: string; desc?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="dash-info-row">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {desc ? <p className="text-xs text-muted">{desc}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full ${on ? "bg-lime" : "bg-elev"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${on ? "start-5" : "start-0.5"}`} />
      </button>
    </div>
  );
}

function NotifPrefsPanel() {
  const { notifPrefs, setNotifPrefs, geo, requestLocation, setGeoCity } = useApp();
  const { t } = useI18n();
  return (
    <Pane title={t("dash.app.notif")}>
      <ToggleRow title={t("notif.p1")} desc={t("notif.p1d")} on={notifPrefs.priceDrop} onChange={(v) => setNotifPrefs({ priceDrop: v })} />
      <ToggleRow title={t("notif.p2")} desc={t("notif.p2d")} on={notifPrefs.savedSearch} onChange={(v) => setNotifPrefs({ savedSearch: v })} />
      <ToggleRow title={t("notif.p3")} desc={t("notif.p3d")} on={notifPrefs.nearby} onChange={(v) => setNotifPrefs({ nearby: v })} />
      <div className="mt-4">
        <p className="dash-row-label mb-2">{t("notif.kind.nearby")}</p>
        <button type="button" className="btn-primary mb-3 h-10 px-4 text-sm" onClick={requestLocation}>
          {t("loc.allow")}
        </button>
        <SearchSelect
          label={t("notif.city")}
          value={geo.city ?? ""}
          options={TURKEY_CITIES.map((c) => c.name)}
          placeholder={t("notif.city")}
          onChange={setGeoCity}
        />
      </div>
    </Pane>
  );
}

function ReadReceiptPanel() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<DashPrefs>(loadPrefs);
  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);
  return (
    <Pane title={t("dash.app.read")}>
      <p className="mb-3 text-sm text-muted">{t("dash.read.p")}</p>
      <ToggleRow title={t("dash.read.on")} desc={t("dash.read.d")} on={prefs.readReceipts} onChange={(v) => setPrefs({ ...prefs, readReceipts: v })} />
    </Pane>
  );
}

function MarketingPanel() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<DashPrefs>(loadPrefs);
  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);
  return (
    <Pane title={t("dash.app.mkt")}>
      <p className="mb-3 text-sm text-muted">{t("dash.mkt.p")}</p>
      <ToggleRow title={t("dash.mkt.email")} on={prefs.marketingEmail} onChange={(v) => setPrefs({ ...prefs, marketingEmail: v })} />
      <ToggleRow title={t("dash.mkt.sms")} on={prefs.marketingSms} onChange={(v) => setPrefs({ ...prefs, marketingSms: v })} />
      <ToggleRow title={t("dash.mkt.push")} on={prefs.marketingPush} onChange={(v) => setPrefs({ ...prefs, marketingPush: v })} />
    </Pane>
  );
}
