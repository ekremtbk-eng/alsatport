"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  conversations as seedConversations,
  listings as seedListings,
  type Conversation,
  type Listing,
  type UserProfile,
} from "@/data/store";
import { seedReviews, type SellerReview } from "@/data/reviews";
import { cityPoint, isNearbyListing, nearestCity } from "@/lib/geo";
import { hasConsent } from "@/lib/consent";
import { isBlockedLiveAnimalListing } from "@/lib/liveAnimalPolicy";
import {
  DEFAULT_NOTIF_PREFS,
  listingMatchesSearch,
  type AppNotification,
  type GeoState,
  type NotifPrefs,
  type SavedSearch,
} from "@/lib/notify";
import { type AuthResult } from "@/lib/auth";
import { buildLiveCategoryCounts } from "@/lib/categoryCounts";
import { isUuid } from "@/lib/ids";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, getCsrfToken, resetCsrfToken } from "@/lib/security/client";
import { listingPatchForProfile, type ListingEntitlementPatch } from "@/lib/entitlements";
import { usePathname } from "next/navigation";
import { applyExpiryToListing } from "@/lib/listingQuota";
import { isUsableListingImage } from "@/lib/listingMedia";

type AppState = {
  user: UserProfile | null;
  listings: Listing[];
  favorites: string[];
  conversations: Conversation[];
  reviews: SellerReview[];
  savedSearches: SavedSearch[];
  notifications: AppNotification[];
  notifPrefs: NotifPrefs;
  geo: GeoState;
  hydrated: boolean;
  unreadNotifications: number;
  loginWithPassword: (identifier: string, password: string) => Promise<AuthResult>;
  verifyLoginCode: (otp: string, trust: boolean) => Promise<AuthResult>;
  /** Applies a fresh profile returned by an account API. */
  adoptSession: (user: UserProfile) => void;
  registerAccount: (input: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    marketing?: boolean;
    phone?: string;
    recaptchaToken?: string;
  }) => Promise<AuthResult>;
  completeProfile: (input: {
    fullName: string;
    phone: string;
    address: string;
    displayName?: string;
  }) => Promise<AuthResult>;
  startEmailVerify: () => Promise<{ ok: boolean; error?: string; sandboxCode?: string; already?: boolean }>;
  confirmEmailVerify: (otp: string) => Promise<AuthResult>;
  startPhoneVerify: () => Promise<{ ok: boolean; error?: string; sandboxCode?: string; already?: boolean }>;
  confirmPhoneVerify: (otp: string) => Promise<AuthResult>;
  logout: () => void;
  toggleFavorite: (id: string) => void;
  addListing: (listing: Listing) => Promise<{ ok: boolean; error?: string; listing?: Listing; status?: number }>;
  updateListing: (id: string, patch: Partial<Listing>) => Promise<{ ok: boolean; error?: string; status?: number }>;
  removeListing: (id: string) => Promise<void>;
  updateListingPrice: (id: string, price: number) => void;
  setListingStatus: (id: string, status: Listing["status"]) => void;
  renewListing: (id: string) => Promise<boolean>;
  setListingSale: (id: string, action: "sold" | "resale") => Promise<{ ok: boolean; error?: string }>;
  sendMessage: (conversationId: string, text: string, fromMe?: boolean) => Promise<boolean>;
  startConversation: (listing: Listing) => Promise<string>;
  refreshConversation: (id: string) => Promise<void>;
  setPlan: (plan: UserProfile["plan"]) => void;
  purchaseProduct: (product: "profesyonel" | "vip" | "doping") => Promise<{ ok: boolean; error?: string }>;
  refreshSession: () => Promise<UserProfile | null>;
  startPaytrCheckout: (input: {
    product: "profesyonel" | "vip" | "doping";
    legalAccepted: boolean;
  }) => Promise<{ ok: boolean; error?: string; paymentId?: string; iframeUrl?: string }>;
  pollPayment: (paymentId: string) => Promise<{
    ok: boolean;
    status?: string;
    user?: UserProfile | null;
  }>;
  reviewsFor: (sellerId: string) => SellerReview[];
  addReview: (input: { sellerId: string; listingId?: string; rating: number; text: string }) => void;
  saveSearch: (input: { query: string; city?: string; filter?: string }) => boolean;
  removeSavedSearch: (id: string) => void;
  isSearchSaved: (query: string, city?: string, filter?: string) => boolean;
  setNotifPrefs: (patch: Partial<NotifPrefs>) => void;
  pushNotifs: (items: AppNotification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  requestLocation: () => void;
  setGeoCity: (city: string) => void;
  dismissLocationPrompt: () => void;
  publishWatchListing: () => string;
  categoryCounts: Record<string, number>;
};

const Ctx = createContext<AppState | null>(null);
const KEY = "alsatport-state-v9";
const ENTITLEMENTS_EVENT = "alsatport-entitlements";
const LEGACY_KEYS = [
  "alsatport-state-v8",
  "alsatport-state-v7",
  "alsatport-state-v6",
  "alsatport-state-v5",
  "alsatport-state-v4",
  "alsatport-state-v3",
  "alsatport-state-v2",
  "alsatport-state-v1",
];

function sameSearch(
  a: { query: string; city?: string; filter?: string },
  b: { query: string; city?: string; filter?: string },
) {
  return (
    a.query.trim().toLocaleLowerCase("tr") === b.query.trim().toLocaleLowerCase("tr") &&
    (a.city || "") === (b.city || "") &&
    (a.filter || "") === (b.filter || "")
  );
}

function listingPhotos(l: Listing & { originalImages?: string[] }) {
  const raw = l.originalImages?.length ? l.originalImages : (l.images ?? []);
  return raw.filter(isUsableListingImage);
}

function capNotifs(list: AppNotification[]) {
  return list.slice(0, 60);
}

const SERVER_NOTIF_PREFIX = "srv:";

/** Server inbox replaces its previous copy; device-local alerts (price, search, nearby) stay as they are. */
function mergeServerNotifs(prev: AppNotification[], server: AppNotification[]) {
  const local = prev.filter((n) => !n.id.startsWith(SERVER_NOTIF_PREFIX));
  return capNotifs([...server, ...local].sort((a, b) => b.createdAt - a.createdAt));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>(() =>
    process.env.NODE_ENV === "production" ? [] : seedListings,
  );
  const [favorites, setFavorites] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    process.env.NODE_ENV === "production" ? [] : seedConversations,
  );
  const [reviews, setReviews] = useState<SellerReview[]>(() =>
    process.env.NODE_ENV === "production" ? [] : seedReviews,
  );
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifPrefs, setNotifPrefsState] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [watchedPrices, setWatchedPrices] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const [alertsReady, setAlertsReady] = useState(false);

  const userRef = useRef(user);
  const listingsRef = useRef(listings);
  const prefsRef = useRef(notifPrefs);
  const geoRef = useRef(geo);
  const searchesRef = useRef(savedSearches);
  const favoritesRef = useRef(favorites);
  const pricesRef = useRef(watchedPrices);
  userRef.current = user;
  listingsRef.current = listings;
  prefsRef.current = notifPrefs;
  geoRef.current = geo;
  searchesRef.current = savedSearches;
  favoritesRef.current = favorites;
  pricesRef.current = watchedPrices;

  const applyListingPatch = useCallback((sellerId: string, patch: ListingEntitlementPatch) => {
    setListings((prev) =>
      prev.map((l) =>
        l.sellerId === sellerId && l.status === "active"
          ? {
              ...l,
              featured: patch.featured,
              vip: patch.vip,
            }
          : l,
      ),
    );
  }, []);

  const sessionInflight = useRef<Promise<UserProfile | null> | null>(null);
  const refreshSession = useCallback(async () => {
    if (sessionInflight.current) return sessionInflight.current;
    const job = (async () => {
      try {
        const session = await apiGet<{
          ok: boolean;
          user: UserProfile | null;
          listingPatch?: ListingEntitlementPatch;
        }>("/api/auth/session");
        const next = session.user ?? null;
        setUser(next);
        if (next) {
          const patch = session.listingPatch ?? listingPatchForProfile(next);
          applyListingPatch(next.id, patch);
        }
        return next;
      } catch {
        setUser(null);
        return null;
      } finally {
        sessionInflight.current = null;
      }
    })();
    sessionInflight.current = job;
    return job;
  }, [applyListingPatch]);
  const refreshSessionRef = useRef(refreshSession);
  refreshSessionRef.current = refreshSession;

  const pushNotifs = useCallback((items: AppNotification[]) => {
    if (!items.length) return;
    setNotifications((prev) => {
      const have = new Set(prev.map((n) => n.id));
      const fresh = items.filter((n) => n.id && !have.has(n.id));
      if (!fresh.length) return prev;
      return capNotifs([...fresh, ...prev]);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw =
          localStorage.getItem(KEY) ?? LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) ?? null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.listings) {
            /* Listings now load from /api/listings — ignore local catalog cache. */
          }
          if (parsed.reviews && process.env.NODE_ENV !== "production") {
            const map = new Map(seedReviews.map((r) => [r.id, r]));
            for (const r of parsed.reviews as SellerReview[]) {
              if (r?.id) map.set(r.id, r);
            }
            setReviews([...map.values()]);
          }
          if (parsed.savedSearches) setSavedSearches(parsed.savedSearches);
          if (parsed.notifications) setNotifications(parsed.notifications);
          if (parsed.notifPrefs) setNotifPrefsState({ ...DEFAULT_NOTIF_PREFS, ...parsed.notifPrefs });
          if (parsed.geo) setGeo(parsed.geo);
          if (parsed.watchedPrices) setWatchedPrices(parsed.watchedPrices);
        }
      } catch {
        /* ignore corrupt cache */
      }
      try {
        await getCsrfToken();
        if (!cancelled) await refreshSessionRef.current();
        const db = await apiGet<{ ok?: boolean; listings?: Listing[] }>("/api/listings");
        if (!cancelled) {
          const remote = (db.listings ?? []).filter((l) => !isBlockedLiveAnimalListing(l));
          if (process.env.NODE_ENV === "production") {
            setListings(remote.map((l) => applyExpiryToListing(l)));
          } else {
            const byId = new Map(seedListings.map((l) => [l.id, l]));
            for (const l of remote) byId.set(l.id, l);
            setListings([...byId.values()].map((l) => applyExpiryToListing(l)));
          }
        }
      } catch {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) {
        setListings((prev) => prev.map((l) => applyExpiryToListing(l)));
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setListings((prev) => prev.map((l) => applyExpiryToListing(l)));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (
      pathname === "/paketler" ||
      pathname.startsWith("/profil") ||
      pathname.startsWith("/odeme") ||
      pathname.startsWith("/ilan-ver") ||
      pathname.startsWith("/ilanlarim")
    ) {
      void refreshSession();
    }
  }, [pathname, hydrated, refreshSession]);

  useEffect(() => {
    if (!hydrated) return;
    let timer: number | undefined;
    const kick = () => {
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refreshSession(), 200);
    };
    window.addEventListener("focus", kick);
    document.addEventListener("visibilitychange", kick);
    window.addEventListener(ENTITLEMENTS_EVENT, kick);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", kick);
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener(ENTITLEMENTS_EVENT, kick);
    };
  }, [hydrated, refreshSession]);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      setWatchedPrices((prev) => {
        const next = { ...prev };
        for (const l of listings) {
          if (next[l.id] == null) next[l.id] = l.price;
        }
        return next;
      });
      setSavedSearches((prev) =>
        prev.map((s) => ({
          ...s,
          seenIds: s.seenIds?.length
            ? s.seenIds
            : listings.filter((l) => listingMatchesSearch(l, s)).map((l) => l.id),
        })),
      );
      setAlertsReady(true);
    }, 0);
    return () => window.clearTimeout(t);
    // only after first hydrate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !alertsReady) return;
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const signedIn = Boolean(userRef.current);
      localStorage.setItem(
        KEY,
        JSON.stringify({
          ...parsed,
          reviews,
          notifications: notifications.filter((n) => !n.id.startsWith(SERVER_NOTIF_PREFIX)),
          geo: hasConsent("functional") ? geoRef.current : undefined,
          watchedPrices: pricesRef.current,
          savedSearches: signedIn ? parsed.savedSearches : searchesRef.current,
          notifPrefs: signedIn ? parsed.notifPrefs : prefsRef.current,
        }),
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [
    listings,
    reviews,
    savedSearches,
    notifications,
    notifPrefs,
    geo,
    watchedPrices,
    hydrated,
    alertsReady,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      setFavorites([]);
      setConversations(process.env.NODE_ENV === "production" ? [] : seedConversations);
      return;
    }
    let cancelled = false;
    const pull = async () => {
      if (document.visibilityState === "hidden") return;
      const [fav, inbox] = await Promise.all([
        apiGet<{ ok?: boolean; listingIds?: string[] }>("/api/favorites"),
        apiGet<{ ok?: boolean; conversations?: Conversation[] }>("/api/conversations"),
      ]);
      if (cancelled) return;
      setFavorites(fav.listingIds ?? []);
      setConversations((prev) => {
        const api = inbox.conversations ?? [];
        if (process.env.NODE_ENV === "production") return api;
        const demo = prev.filter((c) => c.listingId && !isUuid(c.listingId));
        return [...api, ...demo.filter((d) => !api.some((a) => a.id === d.id))];
      });
    };
    void pull();
    const timer = window.setInterval(() => void pull(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hydrated, user?.id]);

  const inboxUserId = user?.id;
  useEffect(() => {
    if (!hydrated) return;
    if (!inboxUserId) {
      setNotifications((prev) => prev.filter((n) => !n.id.startsWith(SERVER_NOTIF_PREFIX)));
      return;
    }
    let cancelled = false;
    const pull = async () => {
      if (document.visibilityState === "hidden") return;
      const res = await apiGet<{
        ok?: boolean;
        notifications?: (Omit<AppNotification, "kind"> & { kind: string })[];
      }>("/api/notifications");
      if (cancelled || !res.ok || !res.notifications) return;
      const server: AppNotification[] = res.notifications.map((n) => ({ ...n, kind: "system" }));
      setNotifications((prev) => mergeServerNotifs(prev, server));
    };
    void pull();
    const timer = window.setInterval(() => void pull(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hydrated, inboxUserId]);

  const migratedAlertsForUser = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      migratedAlertsForUser.current = null;
      try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        setSavedSearches(Array.isArray(parsed.savedSearches) ? parsed.savedSearches : []);
        setNotifPrefsState(
          parsed.notifPrefs ? { ...DEFAULT_NOTIF_PREFS, ...parsed.notifPrefs } : DEFAULT_NOTIF_PREFS,
        );
      } catch {
        setSavedSearches([]);
        setNotifPrefsState(DEFAULT_NOTIF_PREFS);
      }
      return;
    }
    let cancelled = false;
    const userId = user.id;
    void (async () => {
      const alerts = await apiGet<{
        ok?: boolean;
        savedSearches?: SavedSearch[];
        notifPrefs?: NotifPrefs;
      }>("/api/account/alerts");
      if (cancelled || !alerts.ok) return;
      if (migratedAlertsForUser.current !== userId) {
        migratedAlertsForUser.current = userId;
        try {
          const raw = localStorage.getItem(KEY);
          const parsed = raw ? JSON.parse(raw) : {};
          const guest = Array.isArray(parsed.savedSearches) ? (parsed.savedSearches as SavedSearch[]) : [];
          const remote = alerts.savedSearches ?? [];
          for (const s of guest) {
            if (remote.some((r) => sameSearch(r, s))) continue;
            if (!s.query && !s.city && !s.filter) continue;
            await apiPost("/api/account/saved-searches", {
              query: s.query,
              city: s.city,
              filter: s.filter,
              seenIds: s.seenIds,
            });
          }
        } catch {
          /* keep remote copy */
        }
        const fresh = await apiGet<{
          ok?: boolean;
          savedSearches?: SavedSearch[];
          notifPrefs?: NotifPrefs;
        }>("/api/account/alerts");
        if (cancelled || !fresh.ok) return;
        setSavedSearches(fresh.savedSearches ?? []);
        if (fresh.notifPrefs) setNotifPrefsState({ ...DEFAULT_NOTIF_PREFS, ...fresh.notifPrefs });
        return;
      }
      setSavedSearches(alerts.savedSearches ?? []);
      if (alerts.notifPrefs) setNotifPrefsState({ ...DEFAULT_NOTIF_PREFS, ...alerts.notifPrefs });
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user?.id]);

  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!alertsReady) return;
    if (!knownIdsRef.current) {
      knownIdsRef.current = new Set(listings.map((l) => l.id));
      return;
    }

    const known = knownIdsRef.current;
    const me = userRef.current?.id;
    const prefs = prefsRef.current;
    const incoming: AppNotification[] = [];
    const nextPrices = { ...pricesRef.current };

    for (const l of listings) {
      const isNew = !known.has(l.id);
      if (isNew) {
        known.add(l.id);
        nextPrices[l.id] = l.price;
        if (me && l.sellerId === me) continue;

        if (prefs.savedSearch) {
          for (const s of searchesRef.current) {
            if (!listingMatchesSearch(l, s)) continue;
            incoming.push({
              id: crypto.randomUUID(),
              kind: "search",
              title: "Favori aramanıza yeni ilan",
              body: `${s.query || s.city} · ${l.title} (${l.city})`,
              href: `/ilan/${l.id}`,
              createdAt: Date.now(),
              read: false,
              listingId: l.id,
            });
          }
        }

        const g = geoRef.current;
        let point: { lat: number; lng: number; city?: string } | null = null;
        if (g.lat != null && g.lng != null) point = { lat: g.lat, lng: g.lng, city: g.city };
        else if (g.city) {
          const c = cityPoint(g.city);
          if (c) point = { ...c, city: g.city };
        }
        if (prefs.nearby && point && isNearbyListing(l.city, point)) {
          incoming.push({
            id: crypto.randomUUID(),
            kind: "nearby",
            title: "Konumunuza yakın yeni ilan",
            body: `${l.title} · ${l.city}${l.district ? ` / ${l.district}` : ""}`,
            href: `/ilan/${l.id}`,
            createdAt: Date.now(),
            read: false,
            listingId: l.id,
          });
        }
        continue;
      }

      const prevPrice = nextPrices[l.id];
      if (
        prefs.priceDrop &&
        prevPrice != null &&
        l.price < prevPrice &&
        favoritesRef.current.includes(l.id) &&
        l.sellerId !== me
      ) {
        incoming.push({
          id: crypto.randomUUID(),
          kind: "price",
          title: "Favori ilanda fiyat düştü",
          body: `${l.title} ${prevPrice.toLocaleString("tr-TR")} TL → ${l.price.toLocaleString("tr-TR")} TL`,
          href: `/ilan/${l.id}`,
          createdAt: Date.now(),
          read: false,
          listingId: l.id,
        });
      }
      nextPrices[l.id] = l.price;
    }

    setWatchedPrices(nextPrices);
    if (incoming.length) pushNotifs(incoming);
  }, [alertsReady, listings, pushNotifs]);

  const loginWithPassword = useCallback(async (identifier: string, password: string): Promise<AuthResult> => {
    if (!identifier.trim() || !password) return { ok: false, error: "auth.err.required" };
    const res = await apiPost<{
      ok: boolean;
      error?: string;
      needsProfile?: boolean;
      needsEmailVerify?: boolean;
      user?: UserProfile;
      twoFactor?: boolean;
      method?: "email" | "sms";
      maskedTarget?: string;
      maskedEmail?: string;
      hasRecovery?: boolean;
      canEmail?: boolean;
      expiresIn?: number;
      resendIn?: number;
      sandboxCode?: string;
    }>(
      "/api/auth/login",
      { identifier, password },
    );
    if (res.ok && res.twoFactor) {
      return {
        ok: true,
        needsProfile: false,
        twoFactor: {
          method: res.method ?? "email",
          maskedTarget: res.maskedTarget ?? res.maskedEmail ?? "",
          maskedEmail: res.maskedEmail ?? "",
          hasRecovery: !!res.hasRecovery,
          canEmail: !!res.canEmail,
          expiresIn: res.expiresIn ?? 0,
          resendIn: res.resendIn ?? 0,
          sandboxCode: res.sandboxCode,
        },
      };
    }
    if (!res.ok || !res.user) return { ok: false, error: res.error ?? "auth.err.wrong" };
    setUser(res.user);
    return { ok: true, needsProfile: !!res.needsProfile, needsEmailVerify: !!res.needsEmailVerify || res.user.emailVerified === false };
  }, []);

  const verifyLoginCode = useCallback(async (otp: string, trust: boolean): Promise<AuthResult> => {
    const res = await apiPost<{
      ok: boolean;
      error?: string;
      needsProfile?: boolean;
      needsEmailVerify?: boolean;
      user?: UserProfile;
    }>("/api/auth/login/verify", { otp, trust });
    if (!res.ok || !res.user) return { ok: false, error: res.error ?? "complete.err.emailCode" };
    setUser(res.user);
    return { ok: true, needsProfile: !!res.needsProfile, needsEmailVerify: !!res.needsEmailVerify || res.user.emailVerified === false };
  }, []);

  const adoptSession = useCallback((next: UserProfile) => {
    setUser(next);
  }, []);

  const registerAccount = useCallback(
    async (input: {
      username: string;
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      marketing?: boolean;
      phone?: string;
      recaptchaToken?: string;
    }): Promise<AuthResult> => {
      const res = await apiPost<{ ok: boolean; error?: string; needsProfile?: boolean; user?: UserProfile }>(
        "/api/auth/register",
        input,
      );
      if (!res.ok || !res.user) return { ok: false, error: res.error ?? "auth.err.required" };
      setUser(res.user);
      return { ok: true, needsProfile: !!res.needsProfile, needsEmailVerify: true };
    },
    [],
  );

  const completeProfile = useCallback(
    async (input: {
      fullName: string;
      phone: string;
      address: string;
      displayName?: string;
    }): Promise<AuthResult> => {
      const res = await apiPost<{ ok: boolean; error?: string; user?: UserProfile; needsProfile?: boolean }>(
        "/api/account/profile",
        input,
      );
      if (!res.ok || !res.user) return { ok: false, error: res.error ?? "auth.err.session" };
      setUser(res.user);
      return { ok: true, needsProfile: !!res.needsProfile };
    },
    [],
  );

  const startEmailVerify = useCallback(async () => {
    const res = await apiPost<{
      ok: boolean;
      error?: string;
      sandboxCode?: string;
      already?: boolean;
    }>("/api/account/email/start", {});
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, sandboxCode: res.sandboxCode, already: res.already };
  }, []);

  const confirmEmailVerify = useCallback(async (otp: string): Promise<AuthResult> => {
    const res = await apiPost<{ ok: boolean; error?: string; user?: UserProfile; needsProfile?: boolean }>(
      "/api/account/email/confirm",
      { otp },
    );
    if (!res.ok || !res.user) return { ok: false, error: res.error ?? "complete.err.emailCode" };
    setUser(res.user);
    return { ok: true, needsProfile: !!res.needsProfile };
  }, []);

  const startPhoneVerify = useCallback(async () => {
    const res = await apiPost<{
      ok: boolean;
      error?: string;
      sandboxCode?: string;
      already?: boolean;
    }>("/api/account/phone/start", {});
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, sandboxCode: res.sandboxCode, already: res.already };
  }, []);

  const confirmPhoneVerify = useCallback(async (otp: string): Promise<AuthResult> => {
    const res = await apiPost<{ ok: boolean; error?: string; user?: UserProfile; needsProfile?: boolean }>(
      "/api/account/phone/confirm",
      { otp },
    );
    if (!res.ok || !res.user) return { ok: false, error: res.error ?? "complete.err.emailCode" };
    setUser(res.user);
    return { ok: true, needsProfile: !!res.needsProfile };
  }, []);

  const logout = useCallback(() => {
    void apiPost("/api/auth/logout", {}).then(() => {
      resetCsrfToken();
      void getCsrfToken();
    });
    setUser(null);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const liked = prev.includes(id);
      const next = liked ? prev.filter((x) => x !== id) : [...prev, id];
      if (userRef.current && isUuid(id)) {
        const req = liked
          ? apiDelete<{ ok?: boolean }>(`/api/favorites/${id}`)
          : apiPost<{ ok?: boolean }>("/api/favorites", { listingId: id });
        void req.then((res) => {
          if (!res.ok) {
            setFavorites((cur) => (liked ? [...new Set([...cur, id])] : cur.filter((x) => x !== id)));
          }
        });
      }
      return next;
    });
  }, []);

  const updateListing = useCallback(async (id: string, patch: Partial<Listing>) => {
    const res = await apiPut<{ ok: boolean; error?: string; listing?: Listing }>(`/api/listings/${id}`, patch);
    if (!res.ok || !res.listing) return { ok: false, error: res.error ?? "auth.err.server", status: res.status };
    setListings((prev) => prev.map((l) => (l.id === id ? res.listing! : l)));
    return { ok: true };
  }, []);

  const addListing = useCallback(async (listing: Listing) => {
    if (isBlockedLiveAnimalListing(listing)) return { ok: false, error: "mod.animal" };
    const payload = {
      id: listing.id,
      title: listing.title,
      subtitle: listing.subtitle,
      price: listing.price,
      categoryId: listing.categoryId,
      city: listing.city,
      district: listing.district,
      neighborhood: listing.neighborhood,
      lat: listing.lat,
      lng: listing.lng,
      images: listing.images,
      description: listing.description,
      specs: listing.specs,
      features: listing.features,
      chassis: listing.chassis,
      listingNo: listing.listingNo,
      expiresAt: listing.expiresAt,
      urgent: listing.urgent,
    };
    const res = await apiPost<{
      ok: boolean;
      error?: string;
      listing?: Listing;
      listingsPosted?: number;
    }>("/api/listings", payload);
    if (!res.ok) return { ok: false, error: res.error ?? "auth.err.server", status: res.status };
    const nextListing = res.listing ?? { ...listing, status: "active" as const };
    setListings((prev) => [nextListing, ...prev.filter((l) => l.id !== nextListing.id)]);
    setUser((u) =>
      u
        ? {
            ...u,
            listings: u.listings + 1,
            listingsPosted: res.listingsPosted ?? (u.listingsPosted ?? 0) + 1,
          }
        : u,
    );
    return { ok: true, listing: nextListing };
  }, []);

  const removeListing = useCallback(async (id: string) => {
    const res = await apiDelete<{ ok: boolean }>(`/api/listings/${id}`);
    if (!res.ok) return;
    setListings((prev) => {
      const target = prev.find((l) => l.id === id);
      if (target?.sellerId) {
        setUser((u) =>
          u && u.id === target.sellerId ? { ...u, listings: Math.max(0, u.listings - 1) } : u,
        );
      }
      return prev.filter((l) => l.id !== id);
    });
    setFavorites((prev) => prev.filter((x) => x !== id));
  }, []);

  const updateListingPrice = useCallback((id: string, price: number) => {
    void apiPut(`/api/listings/${id}`, { price }).then((res) => {
      if (res && (res as { ok?: boolean }).ok) {
        setListings((prev) => prev.map((l) => (l.id === id ? { ...l, price } : l)));
      }
    });
  }, []);

  const setListingStatus = useCallback((id: string, status: Listing["status"]) => {
    void apiPut<{ ok: boolean; listing?: Listing }>(`/api/listings/${id}`, { status }).then((res) => {
      if (res.ok && res.listing) {
        setListings((prev) => prev.map((l) => (l.id === id ? res.listing! : l)));
      }
    });
  }, []);

  const renewListing = useCallback(async (id: string) => {
    const res = await apiPost<{ ok: boolean; listing?: Listing }>("/api/listings/renew", { id });
    if (!res.ok || !res.listing) return false;
    setListings((prev) => prev.map((l) => (l.id === id ? res.listing! : l)));
    return true;
  }, []);

  const setListingSale = useCallback(async (id: string, action: "sold" | "resale") => {
    const res = await apiPost<{ ok: boolean; error?: string; listing?: Listing }>(`/api/listings/${id}/sold`, { action });
    if (!res.ok || !res.listing) return { ok: false, error: res.error ?? "auth.err.server" };
    setListings((prev) => prev.map((l) => (l.id === id ? res.listing! : l)));
    return { ok: true };
  }, []);

  const startPaytrCheckout = useCallback(
    async (input: { product: "profesyonel" | "vip" | "doping"; legalAccepted: boolean }) => {
      const res = await apiPost<{
        ok: boolean;
        error?: string;
        paymentId?: string;
        iframeUrl?: string;
      }>("/api/payments/checkout", {
        product: input.product,
        legalAccepted: input.legalAccepted === true,
      });
      if (!res.ok) return { ok: false, error: res.error };
      return { ok: true, paymentId: res.paymentId, iframeUrl: res.iframeUrl };
    },
    [],
  );

  const pollPayment = useCallback(
    async (paymentId: string) => {
      const res = await apiGet<{
        ok?: boolean;
        status?: string;
        user?: UserProfile | null;
        listingPatch?: ListingEntitlementPatch;
      }>(`/api/payments/${paymentId}`);
      if (!res.ok) return { ok: false };
      if (res.status === "succeeded" && res.user) {
        setUser(res.user);
        if (res.listingPatch) applyListingPatch(res.user.id, res.listingPatch);
        window.dispatchEvent(new Event(ENTITLEMENTS_EVENT));
      }
      return { ok: true, status: res.status, user: res.user };
    },
    [applyListingPatch],
  );

  const purchaseProduct = useCallback(async (_product: "profesyonel" | "vip" | "doping") => {
    return { ok: false, error: "pay.campaign" };
  }, []);

  const refreshConversation = useCallback(async (id: string) => {
    if (!isUuid(id)) return;
    const res = await apiGet<{ ok?: boolean; conversation?: Conversation }>(`/api/conversations/${id}`);
    if (!res.ok || !res.conversation) return;
    setConversations((prev) => {
      if (prev.some((c) => c.id === id)) return prev.map((c) => (c.id === id ? res.conversation! : c));
      return [res.conversation!, ...prev];
    });
  }, []);

  const sendMessage = useCallback(async (conversationId: string, text: string, fromMe = true) => {
    if (fromMe && isUuid(conversationId)) {
      const res = await apiPost<{
        ok: boolean;
        error?: string;
        text?: string;
        conversation?: Conversation;
      }>("/api/messages", { conversationId, text });
      if (!res.ok) return false;
      if (res.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? res.conversation! : c)));
      }
      return true;
    }
    const now = new Date();
    const time = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: text,
              time,
              unread: fromMe ? 0 : c.unread + 1,
              messages: [...c.messages, { id: crypto.randomUUID(), fromMe, text, time }],
            }
          : c,
      ),
    );
    return true;
  }, []);

  const startConversation = useCallback(async (listing: Listing) => {
    if (isUuid(listing.id) && isUuid(listing.sellerId) && userRef.current) {
      const res = await apiPost<{ ok: boolean; conversation?: Conversation }>("/api/conversations", {
        listingId: listing.id,
      });
      if (!res.ok || !res.conversation) return "";
      setConversations((prev) => [res.conversation!, ...prev.filter((c) => c.id !== res.conversation!.id)]);
      return res.conversation.id;
    }
    let created = "";
    setConversations((prev) => {
      const existing = prev.find((c) => c.listingId === listing.id && c.peerName === listing.sellerName);
      if (existing) {
        created = existing.id;
        return prev;
      }
      const id = crypto.randomUUID();
      created = id;
      return [
        {
          id,
          listingId: listing.id,
          listingTitle: listing.title,
          listingImage: listing.images[0],
          peerName: listing.sellerName,
          peerAvatar: listing.sellerAvatar,
          lastMessage: "Sohbet başladı",
          time: "şimdi",
          unread: 0,
          favorite: false,
          peerVerified: listing.sellerVerified,
          messages: [],
        },
        ...prev,
      ];
    });
    return created;
  }, []);

  const setPlan = useCallback((_plan: UserProfile["plan"]) => {
    void refreshSession();
  }, [refreshSession]);

  const reviewsFor = useCallback(
    (sellerId: string) => reviews.filter((r) => r.sellerId === sellerId),
    [reviews],
  );

  const addReview = useCallback(
    (input: { sellerId: string; listingId?: string; rating: number; text: string }) => {
      if (!user) return;
      void apiPost<{ ok?: boolean; review?: SellerReview }>("/api/reviews", {
        sellerId: input.sellerId,
        listingId: input.listingId,
        rating: input.rating,
        text: input.text,
      }).then((res) => {
        if (!res.review) return;
        setReviews((prev) => [res.review!, ...prev.filter((r) => r.id !== res.review!.id)]);
      });
    },
    [user],
  );

  const isSearchSaved = useCallback(
    (query: string, city?: string, filter?: string) =>
      savedSearches.some((s) => sameSearch(s, { query, city, filter })),
    [savedSearches],
  );

  const saveSearch = useCallback((input: { query: string; city?: string; filter?: string }) => {
    const query = input.query.trim();
    const city = input.city?.trim() || undefined;
    const filter = input.filter?.trim() || undefined;
    if (!query && !city && !filter) return false;
    const seenIds = listings
      .filter((l) =>
        listingMatchesSearch(l, { id: "", query, city, filter, createdAt: 0, seenIds: [] }),
      )
      .map((l) => l.id);
    if (userRef.current) {
      if (searchesRef.current.some((s) => sameSearch(s, { query, city, filter }))) return false;
      const optimistic: SavedSearch = {
        id: crypto.randomUUID(),
        query,
        city,
        filter,
        createdAt: Date.now(),
        seenIds,
      };
      setSavedSearches((prev) => {
        if (prev.some((s) => sameSearch(s, { query, city, filter }))) return prev;
        const next = [optimistic, ...prev];
        searchesRef.current = next;
        return next;
      });
      void apiPost<{ ok?: boolean; search?: SavedSearch; duplicate?: boolean }>(
        "/api/account/saved-searches",
        { query, city, filter, seenIds },
      ).then((res) => {
        if (!res.ok || !res.search) {
          setSavedSearches((prev) => prev.filter((s) => s.id !== optimistic.id));
          return;
        }
        setSavedSearches((prev) => {
          const without = prev.filter(
            (s) => s.id !== optimistic.id && !sameSearch(s, res.search!),
          );
          return [res.search!, ...without];
        });
      });
      return true;
    }
    let added = false;
    setSavedSearches((prev) => {
      if (prev.some((s) => sameSearch(s, { query, city, filter }))) return prev;
      added = true;
      const next: SavedSearch[] = [
        {
          id: crypto.randomUUID(),
          query,
          city,
          filter,
          createdAt: Date.now(),
          seenIds,
        },
        ...prev,
      ];
      searchesRef.current = next;
      return next;
    });
    return added;
  }, [listings]);

  const removeSavedSearch = useCallback((id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    if (userRef.current) {
      void apiDelete(`/api/account/saved-searches?id=${encodeURIComponent(id)}`);
    }
  }, []);

  const setNotifPrefs = useCallback((patch: Partial<NotifPrefs>) => {
    setNotifPrefsState((p) => {
      const next = { ...p, ...patch };
      prefsRef.current = next;
      return next;
    });
    if (userRef.current) {
      void apiPatch("/api/account/alerts", patch);
    }
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (id.startsWith(SERVER_NOTIF_PREFIX) && userRef.current) {
      void apiPost("/api/notifications", { action: "read", ids: [id] });
    }
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (userRef.current) void apiPost("/api/notifications", { action: "readAll" });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (userRef.current) void apiPost("/api/notifications", { action: "clear" });
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo((g) => ({ ...g, status: "unavailable" }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const near = nearestCity(latitude, longitude);
        setGeo({
          status: "granted",
          lat: latitude,
          lng: longitude,
          city: near.name,
          source: "gps",
          dismissed: false,
        });
      },
      () => {
        setGeo((g) => ({ ...g, status: "denied", dismissed: false }));
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
    );
  }, []);

  const setGeoCity = useCallback((city: string) => {
    const c = cityPoint(city);
    setGeo((g) => ({
      ...g,
      status: g.status === "denied" ? "denied" : "granted",
      city,
      lat: c?.lat ?? g.lat,
      lng: c?.lng ?? g.lng,
      source: g.source === "gps" ? "gps" : "manual",
      dismissed: false,
    }));
  }, []);

  const dismissLocationPrompt = useCallback(() => {
    setGeo((g) => ({ ...g, dismissed: true }));
  }, []);

  const publishWatchListing = useCallback(() => {
    if (process.env.NODE_ENV === "production") return "";
    const g = geoRef.current;
    const city = g.city || userRef.current?.city || "İstanbul";
    const q = searchesRef.current[0]?.query || "iPhone";
    const id = `watch-${crypto.randomUUID()}`;
    const listing: Listing = {
      id,
      title: `${q} — yeni fırsat`,
      subtitle: "Bildirim takibi örneği",
      price: 18990,
      categoryId: "phones",
      city,
      district: "",
      images: [
        "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80",
      ],
      description: "Konum ve favori arama bildirimlerini denemek için eklenen örnek ilan.",
      sellerId: "u-selim",
      sellerName: "Selim Demir",
      sellerAvatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      sellerVerified: true,
      createdAt: "şimdi",
      views: 1,
      featured: false,
      vip: false,
      status: "active",
      specs: [{ label: "Durum", value: "İkinci El" }],
      listingNo: String(Math.floor(10_000_000 + Math.random() * 89_000_000)),
      postedAt: Date.now(),
      urgent: true,
    };
    setListings((prev) => [listing, ...prev]);
    return id;
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const categoryCounts = useMemo(() => buildLiveCategoryCounts(listings), [listings]);

  const value = useMemo(
    () => ({
      user,
      listings,
      favorites,
      conversations,
      reviews,
      savedSearches,
      notifications,
      notifPrefs,
      geo,
      hydrated,
      unreadNotifications,
      loginWithPassword,
      verifyLoginCode,
      adoptSession,
      registerAccount,
      startPaytrCheckout,
      pollPayment,
      completeProfile,
      startEmailVerify,
      confirmEmailVerify,
      startPhoneVerify,
      confirmPhoneVerify,
      logout,
      toggleFavorite,
      addListing,
      updateListing,
      removeListing,
      updateListingPrice,
      setListingStatus,
      renewListing,
      setListingSale,
      sendMessage,
      startConversation,
      refreshConversation,
      setPlan,
      purchaseProduct,
      refreshSession,
      reviewsFor,
      addReview,
      saveSearch,
      removeSavedSearch,
      isSearchSaved,
      setNotifPrefs,
      pushNotifs,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications,
      requestLocation,
      setGeoCity,
      dismissLocationPrompt,
      publishWatchListing,
      categoryCounts,
    }),
    [
      user,
      listings,
      favorites,
      conversations,
      reviews,
      savedSearches,
      notifications,
      notifPrefs,
      geo,
      hydrated,
      unreadNotifications,
      loginWithPassword,
      verifyLoginCode,
      adoptSession,
      registerAccount,
      startPaytrCheckout,
      pollPayment,
      completeProfile,
      startEmailVerify,
      confirmEmailVerify,
      startPhoneVerify,
      confirmPhoneVerify,
      logout,
      toggleFavorite,
      addListing,
      updateListing,
      removeListing,
      updateListingPrice,
      setListingStatus,
      renewListing,
      setListingSale,
      sendMessage,
      startConversation,
      refreshConversation,
      setPlan,
      purchaseProduct,
      refreshSession,
      reviewsFor,
      addReview,
      saveSearch,
      removeSavedSearch,
      isSearchSaved,
      setNotifPrefs,
      pushNotifs,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications,
      requestLocation,
      setGeoCity,
      dismissLocationPrompt,
      publishWatchListing,
      categoryCounts,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
