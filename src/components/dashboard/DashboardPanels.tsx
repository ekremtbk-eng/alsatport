"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CreditCard,
  Heart,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
} from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { ListingGrid } from "@/components/ListingGrid";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { isPublicListing } from "@/lib/categoryCounts";
import { listingSellerLabel, maskPersonName } from "@/lib/publicName";
import type { UserProfile } from "@/data/store";
import type { DashPanelId } from "@/lib/dashboardNav";
import { formatNotifTime, listingMatchesSearch, searchHref, searchLabel, type NotifKind } from "@/lib/notify";
import { NUMBER_LOCALE } from "@/i18n/config";
import {
  isEmailVerified,
  isProfileComplete,
  isValidFullName,
  isValidOpenAddress,
  isValidPhone,
  profileGaps,
  safeNextPath,
  postListingHref,
} from "@/lib/profile";
import { apiPost } from "@/lib/security/client";
import { ACCOUNT_DELETE_PHRASE, isDeletePhrase } from "@/lib/accountDelete";
import { LEGAL_PRIVACY_EMAIL } from "@/data/legal";
import { AvatarUploader } from "@/components/AvatarUploader";
import { EntitlementStatus } from "@/components/EntitlementStatus";
import { SellerListings } from "@/components/listings/SellerListings";
import { BusinessStatusCard } from "@/components/business/BusinessStatusCard";
import { useOwnBusiness } from "@/components/business/useOwnBusiness";
import { NotificationSettingsPanel } from "./NotificationSettings";
import { FieldError, Notice, OtpInput, Pane, SandboxCode } from "./DashUi";
import {
  BlocksPanel,
  MarketingPanel,
  MotionPanel,
  PasswordPanel,
  QrPanel,
  ReadReceiptPanel,
  SecurityPanel,
  SessionsPanel,
  TwoFactorPanel,
  VerificationStatusCard,
} from "./AccountPanels";

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
    case "guvenlik":
      return <SecurityPanel />;
    case "sifre":
      return <PasswordPanel />;
    case "iki-asama":
      return <TwoFactorPanel />;
    case "engellenenler":
      return <BlocksPanel />;
    case "cihazlar":
      return <SessionsPanel />;
    case "bildirim-ayarlari":
      return <NotificationSettingsPanel />;
    case "okundu":
      return <ReadReceiptPanel />;
    case "pazarlama":
      return <MarketingPanel />;
    case "hareket":
      return <MotionPanel />;
    case "qr":
      return <QrPanel />;
    case "kurumsal":
      return <BusinessPanel />;
    default:
      return <OzetPanel />;
  }
}

function BusinessPanel() {
  const { t } = useI18n();
  const { business } = useOwnBusiness();
  return (
    <Pane title={t("dash.biz")}>
      {business === undefined ? <p className="dash-empty">{t("common.loading")}</p> : <BusinessStatusCard business={business} />}
    </Pane>
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
  const { t } = useI18n();
  return (
    <Pane title={t("dash.ilanlarim")}>
      <SellerListings />
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
      else map.set(l.sellerId, { id: l.sellerId, name: listingSellerLabel(l), avatar: l.images[0], n: 1 });
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

function PersonalPanel() {
  const { user, completeProfile, startEmailVerify, startPhoneVerify, confirmPhoneVerify, adoptSession } = useApp();
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const [edit, setEdit] = useState<"none" | "name" | "display" | "phone" | "email" | "address">("none");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [error, setError] = useState("");
  const [fieldErr, setFieldErr] = useState<{ name?: string; phone?: string; address?: string }>({});
  const [hint, setHint] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState<"form" | "code">("form");
  const [emailSandbox, setEmailSandbox] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName ?? "");
    setDisplayName(user.displayName ?? "");
    setPhone(user.phone ?? "");
    setAddress(user.address ?? "");
  }, [user]);

  if (!user) return null;
  const gaps = profileGaps(user);
  const showRequiredForm = gaps.some((g) => g === "name" || g === "phone" || g === "address");
  const publicPreview = user.businessVerified && user.businessName
    ? user.businessName
    : maskPersonName(displayName.trim() || user.displayName || user.username);

  function openEdit(next: typeof edit) {
    setError("");
    setHint("");
    setEdit(edit === next ? "none" : next);
  }

  function afterSave(needsProfile?: boolean) {
    setHint(t("bilgi.saved"));
    setEdit("none");
    setFieldErr({});
    const next = search.get("next");
    if (!needsProfile && next) router.push(safeNextPath(next));
  }

  async function persist(patch: { fullName?: string; phone?: string; address?: string; displayName?: string }) {
    setBusy(true);
    const res = await completeProfile({
      fullName: patch.fullName ?? user!.fullName ?? "",
      phone: patch.phone ?? user!.phone ?? "",
      address: patch.address ?? user!.address ?? "",
      displayName: patch.displayName ?? user!.displayName,
    });
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
    if (!isValidOpenAddress(address)) nextErr.address = t("complete.err.address");
    setFieldErr(nextErr);
    if (nextErr.name || nextErr.phone || nextErr.address) return;
    await persist({ fullName, phone, address, displayName });
  }

  async function saveName() {
    setError("");
    if (!isValidFullName(fullName)) {
      setFieldErr({ name: t("complete.err.name") });
      return;
    }
    setFieldErr({});
    await persist({ fullName });
  }

  async function savePhone() {
    setError("");
    if (!isValidPhone(phone)) {
      setFieldErr({ phone: t("complete.err.phone") });
      return;
    }
    setFieldErr({});
    await persist({ phone });
  }

  async function saveAddress() {
    setError("");
    if (!isValidOpenAddress(address)) {
      setFieldErr({ address: t("complete.err.address") });
      return;
    }
    setFieldErr({});
    await persist({ address });
  }

  async function saveDisplay() {
    setError("");
    const name = displayName.trim();
    if (name.length < 2) {
      setError(t("dash.display.err"));
      return;
    }
    await persist({ displayName: name });
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
    setHint(res.already ? t("bilgi.emailOk") : t("bilgi.emailSent"));
  }

  async function startEmailChange() {
    setBusy(true);
    setError("");
    setHint("");
    const res = await apiPost<{ ok: boolean; error?: string; sandboxCode?: string; maskedEmail?: string }>(
      "/api/account/email/change/start",
      { email: newEmail },
    );
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setEmailSandbox(res.sandboxCode ?? "");
    setEmailOtp("");
    setEmailStep("code");
    setHint(t("acct.codeSent").replace("{email}", res.maskedEmail ?? ""));
  }

  async function confirmEmailChange() {
    setBusy(true);
    setError("");
    const res = await apiPost<{ ok: boolean; error?: string; user?: UserProfile }>("/api/account/email/change/confirm", {
      email: newEmail,
      otp: emailOtp,
    });
    setBusy(false);
    if (!res.ok || !res.user) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    adoptSession(res.user);
    setEmailStep("form");
    setNewEmail("");
    setEmailOtp("");
    setEmailSandbox("");
    setEdit("none");
    setHint(t("acct.email.changed"));
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
        {user.verified && isProfileComplete(user) ? (
          <div className="mt-1 flex justify-center">
            <VerifiedBadge size={18} />
          </div>
        ) : null}
      </div>

      <div className="mb-4 mt-3">
        <VerificationStatusCard />
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
      <InfoRow label={t("dash.fullname")} value={user.fullName || "—"} action={t("dash.update")} onAction={() => openEdit("name")} />
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

      <InfoRow label={t("dash.display")} value={user.displayName} action={t("dash.display.update")} onAction={() => openEdit("display")} />
      {edit === "display" || !user.businessVerified ? (
        <p className="-mt-1 mb-2 text-xs text-muted">
          {t("acct.public.preview")}: <b className="text-ink">{publicPreview}</b>
          {user.businessVerified ? null : ` — ${t("acct.public.note")}`}
        </p>
      ) : null}
      {edit === "display" ? (
        <div className="dash-inline-form">
          <input
            className="dash-input"
            aria-label={t("dash.display")}
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy} onClick={() => void saveDisplay()}>
            {t("complete.save")}
          </button>
        </div>
      ) : null}

      <InfoRow
        label={t("dash.phone")}
        value={user.phone ? `${user.phone} · ${user.phoneVerified ? t("dash.phone.verified") : t("dash.phone.on")}` : t("dash.phone.off")}
        action={user.phone ? t("dash.update") : t("dash.phone.add")}
        onAction={() => openEdit("phone")}
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
              <p className="text-[11px] text-muted">{t("acct.phone.viaEmail")}</p>
              <button type="button" className="btn-blue h-10 px-4 text-sm" disabled={busy} onClick={() => void sendPhoneCode()}>
                {t("bilgi.sendPhoneCode")}
              </button>
              <SandboxCode code={phoneCode} label={t("bilgi.inbox")} />
              <OtpInput value={phoneOtp} onChange={setPhoneOtp} />
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
        label={t("dash.email")}
        value={user.email ? `${user.email}${isEmailVerified(user) ? "" : ` · ${t("acct.email.unverified")}`}` : "—"}
        action={t("dash.email.change")}
        onAction={() => openEdit("email")}
      />
      {edit === "email" ? (
        <div className="dash-inline-form">
          {isEmailVerified(user) ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-lime">
              <Mail className="h-4 w-4" /> {t("bilgi.emailOk")}
            </p>
          ) : (
            <button type="button" className="btn-blue h-10 px-4 text-sm" disabled={busy} onClick={() => void sendEmailCode()}>
              {t("bilgi.sendLink")}
            </button>
          )}
          <label className="block" htmlFor="profile-new-email">
            <span className="dash-row-label">{t("acct.email.new")}</span>
            <input
              id="profile-new-email"
              type="email"
              autoComplete="email"
              className="dash-input"
              value={newEmail}
              disabled={emailStep === "code"}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </label>
          <p className="text-[11px] text-muted">{t("acct.email.p")}</p>
          {emailStep === "code" ? (
            <>
              <SandboxCode code={emailSandbox} label={t("bilgi.inbox")} />
              <OtpInput value={emailOtp} onChange={setEmailOtp} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary h-10 px-4 text-sm"
                  disabled={busy || emailOtp.length !== 6}
                  onClick={() => void confirmEmailChange()}
                >
                  {t("acct.confirm")}
                </button>
                <button type="button" className="chip" onClick={() => setEmailStep("form")}>
                  {t("acct.cancel")}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="btn-primary h-10 px-4 text-sm"
              disabled={busy || !newEmail.includes("@")}
              onClick={() => void startEmailChange()}
            >
              {t("acct.sendCode")}
            </button>
          )}
        </div>
      ) : null}

      <InfoRow label={t("bilgi.address")} value={user.address || "—"} action={t("dash.update")} onAction={() => openEdit("address")} />
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

      <Notice error={error} hint={hint} />

      <p className="dash-kvkk">
        {t("dash.kvkk")}{" "}
        <Link href="/kvkk" className="dash-link">
          {t("dash.kvkk.here")}
        </Link>
        .
      </p>
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
  return (
    <Pane title={t("dash.info.pay")}>
      <EntitlementStatus compact />
      <p className="mt-3 text-sm text-muted">{t("dash.pay.p")}</p>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-line px-4 py-4">
        <CreditCard className="h-5 w-5 text-muted" />
        <p className="text-sm">{t("pay.campaign")}</p>
      </div>
      <Link href={postListingHref(user)} className="btn-primary mt-4 inline-flex h-11 px-5">
        {t("post.h")}
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
  const { user, listings } = useApp();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (!user) return null;
  const activeCount = listings.filter((l) => l.sellerId === user.id && l.status === "active").length;
  const phraseOk = isDeletePhrase(phrase);
  const needsPassword = !!user.hasPassword;
  const canSubmit = phraseOk && (!needsPassword || password.length > 0) && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    const res = await apiPost<{ ok?: boolean; error?: string }>("/api/account/delete", {
      password,
      confirm: phrase,
    });
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setDone(true);
    for (const store of [window.localStorage, window.sessionStorage]) {
      try {
        Object.keys(store)
          .filter((k) => k.startsWith("alsatport") || k.startsWith("ap-") || k.startsWith("ap_"))
          .forEach((k) => store.removeItem(k));
      } catch {
        /* storage unavailable */
      }
    }
    window.setTimeout(() => {
      window.location.href = "/";
    }, 1800);
  }

  if (done) {
    return (
      <Pane title={t("account.delete.h")}>
        <Notice hint={t("account.delete.done")} />
      </Pane>
    );
  }

  return (
    <Pane title={t("account.delete.h")}>
      <p className="text-sm text-soft">{t("account.delete.lead")}</p>
      <h3 className="mt-5 text-sm font-extrabold text-ink">{t("account.delete.what.h")}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-soft">
        <li>{t("account.delete.what.1", { n: activeCount })}</li>
        <li>{t("account.delete.what.2")}</li>
        <li>{t("account.delete.what.3")}</li>
        <li>{t("account.delete.what.4")}</li>
        <li>{t("account.delete.what.5")}</li>
      </ul>
      <h3 className="mt-5 text-sm font-extrabold text-ink">{t("account.delete.keep.h")}</h3>
      <p className="mt-2 text-sm text-soft">{t("account.delete.keep.p")}</p>
      <p className="mt-3 text-xs text-muted">
        {t("account.delete.copy")}{" "}
        <a className="font-semibold text-lime" href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>
          {LEGAL_PRIVACY_EMAIL}
        </a>
      </p>

      <form className="mt-5 space-y-3 rounded-2xl border border-orange/30 bg-orange/5 p-4" onSubmit={submit}>
        {needsPassword ? (
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">{t("account.delete.password")}</span>
            <input
              type="password"
              autoComplete="current-password"
              className="dash-input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        ) : (
          <p className="text-xs text-muted">{t("account.delete.google")}</p>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">{t("account.delete.phrase", { phrase: ACCOUNT_DELETE_PHRASE })}</span>
          <input className="dash-input w-full" value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" />
        </label>
        {error ? <p className="text-xs font-semibold text-orange">{error}</p> : null}
        <button type="submit" disabled={!canSubmit} className="btn-orange h-11 px-5 disabled:opacity-40">
          {busy ? t("account.delete.busy") : t("account.delete.go")}
        </button>
      </form>
    </Pane>
  );
}
