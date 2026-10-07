"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, Car, Check, GraduationCap, Hammer, HeartHandshake, Package, PawPrint, Settings, Truck } from "lucide-react";
import { categories, findCategory, parentOf, type Category } from "@/data/categories";
import { useApp } from "@/context/AppContext";
import type { Listing } from "@/data/store";
import { PhotoUploader, MIN_PHOTOS } from "@/components/PhotoUploader";
import { COMPLETE_PATH, isProfileComplete } from "@/lib/profile";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";
import { mahallelerOf } from "@/data/regionProfiles";
import { equipmentForVehicleCombo, typeToCategory, typeFromCategoryId } from "@/data/listingOptions";
import { listingBodyPlaceholder, listingTitlePlaceholder } from "@/data/listingCopy";
import { canPublishListing, expiresAtForUser, listingIsPromoted } from "@/lib/listingQuota";
import { parseListingPrice } from "@/lib/listingPrice";
import { reconcileEntitlements } from "@/lib/entitlements";
import { EntitlementStatus } from "@/components/EntitlementStatus";
import {
  emptyChassis,
  estateDealFromCategoryId,
  estateHomeTypeFromCategoryId,
  partsVehicleTypeFromId,
  motoGearProductFromId,
  schemaForCategoryId,
  specsWithChassis,
  type ChassisStatus,
} from "@/data/listingSchema";
import { SearchSelect } from "@/components/SearchSelect";
import { DynamicAttributeForm } from "@/components/DynamicAttributeForm";
import { ChassisMap } from "@/components/ChassisMap";
import { FeatureGrid } from "@/components/FeatureGrid";
import { catName, useI18n } from "@/context/I18nContext";
import { isPetsCategoryId, moderateListingDraft } from "@/lib/liveAnimalPolicy";
import { showFlashToast } from "@/components/FlashToast";
import { PUBLISHED_PARAM } from "@/components/listing/PublishNotifCard";
import { UrgentOption } from "@/components/business/UrgentOption";
import { useOwnBusiness } from "@/components/business/useOwnBusiness";

export default function PostListingPage() {
  const { user, addListing, updateListing, listings, hydrated } = useApp();
  const { t, formatMoney } = useI18n();
  const types = [
    { id: "urun", label: t("post.urun"), icon: Package },
    { id: "vasita", label: t("post.vasita"), icon: Car },
    { id: "emlak", label: t("post.emlak"), icon: Building2 },
    { id: "parca", label: t("post.parca"), icon: Settings },
    { id: "makine", label: t("post.makine"), icon: Truck },
    { id: "hizmet", label: t("post.hizmet"), icon: Hammer },
    { id: "ders", label: t("post.ders"), icon: GraduationCap },
    { id: "is", label: t("post.is"), icon: Briefcase },
    { id: "hayvan", label: t("post.hayvan"), icon: PawPrint },
    { id: "yardim", label: t("post.yardim"), icon: HeartHandshake },
  ];
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [type, setType] = useState("urun");
  const [categoryId, setCategoryId] = useState("phones");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [district, setDistrict] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [geo, setGeo] = useState<{ key: string; lat: number; lng: number } | null>(null);
  const geoReq = useRef<{ key: string; promise: Promise<{ lat: number; lng: number } | null> } | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [photoHint, setPhotoHint] = useState("");
  const [formHint, setFormHint] = useState("");
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [features, setFeatures] = useState<string[]>([]);
  const [chassis, setChassis] = useState<Record<string, ChassisStatus>>(emptyChassis());
  const [autoEquipNote, setAutoEquipNote] = useState(false);
  const autoEquipRef = useRef<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editReady, setEditReady] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(0);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const { business } = useOwnBusiness();
  const urgentAllowed = business?.status === "approved";
  const publishLock = useRef(false);
  const publishIdRef = useRef(crypto.randomUUID());
  const draftRestored = useRef(false);

  const editing = useMemo(
    () => (editId && user ? listings.find((l) => l.id === editId && l.sellerId === user.id) : undefined),
    [editId, listings, user],
  );

  const live = user ? reconcileEntitlements(user) : null;
  const allowed = canPublishListing(live);
  const steps = [t("post.s0"), t("post.s1"), t("post.s2")];
  const cityNames = useMemo(() => TURKEY_CITIES.map((c) => c.name), []);
  const districts = useMemo(() => districtsOf(city), [city]);
  const mahalleler = useMemo(() => mahallelerOf(city, district), [city, district]);
  const schema = useMemo(() => schemaForCategoryId(categoryId), [categoryId]);
  const locKey = `${city}|${district}|${neighborhood}`;

  const resolveGeo = useCallback((key: string) => {
    if (geoReq.current?.key === key) return geoReq.current.promise;
    const [c, d, n] = key.split("|");
    const qs = new URLSearchParams({ city: c, district: d, neighborhood: n });
    const promise = fetch(`/api/geo/resolve?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { coords?: { lat?: number; lng?: number } | null } | null) =>
        j?.coords && Number.isFinite(j.coords.lat) && Number.isFinite(j.coords.lng)
          ? { lat: j.coords.lat!, lng: j.coords.lng! }
          : null,
      )
      .catch(() => null)
      .then((coords) => {
        if (!coords && geoReq.current?.key === key) geoReq.current = null;
        return coords;
      });
    geoReq.current = { key, promise };
    return promise;
  }, []);

  const typeCats = useMemo(() => {
    const rootId = typeToCategory(type);
    const root = categories.find((c) => c.id === rootId);
    if (!root) return flattenTree(categories);
    return flattenTree([root]);
  }, [type]);

  useEffect(() => {
    if (!hydrated) return;
    const listingPath = `/ilan-ver${window.location.search}`;
    if (!user) {
      router.replace(`/giris?next=${encodeURIComponent(listingPath)}`);
      return;
    }
    if (!isProfileComplete(user)) {
      router.replace(`${COMPLETE_PATH}?next=${encodeURIComponent(listingPath)}`);
    }
  }, [user, router, hydrated]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setEditId(q.get("edit"));
    if (q.get("edit")) return;
    const typeQ = q.get("type");
    const cityQ = q.get("city");
    if (
      typeQ &&
      ["urun", "vasita", "emlak", "parca", "makine", "hizmet", "ders", "is", "hayvan", "yardim"].includes(typeQ)
    ) {
      setType(typeQ);
    }
    if (cityQ && TURKEY_CITIES.some((c) => c.name === cityQ)) setCity(cityQ);
  }, []);

  useEffect(() => {
    if (!hydrated || editReady || !editing) return;
    const sch = schemaForCategoryId(editing.categoryId);
    const nextAttrs: Record<string, string> = {};
    for (const f of sch.fields) {
      const hit = editing.specs.find((s) => s.label === f.specLabel || s.label === f.label);
      if (hit) nextAttrs[f.key] = hit.value;
    }
    setType(typeFromCategoryId(editing.categoryId));
    setCategoryId(editing.categoryId);
    setTitle(editing.title);
    setDescription(editing.description);
    setPrice(editing.price ? String(editing.price) : "");
    setCity(editing.city);
    setDistrict(editing.district);
    setNeighborhood(editing.neighborhood ?? "");
    if (editing.lat != null && editing.lng != null) {
      setGeo({ key: `${editing.city}|${editing.district}|${editing.neighborhood ?? ""}`, lat: editing.lat, lng: editing.lng });
    }
    setImages([...(editing.images ?? [])]);
    setPreviewPhoto(0);
    setFeatures(editing.features ?? []);
    setChassis(editing.chassis ?? emptyChassis());
    setAttrs(nextAttrs);
    setUrgent(!!editing.urgent);
    setEditReady(true);
  }, [hydrated, editReady, editing]);

  useEffect(() => {
    if (!hydrated || !user || editId || draftRestored.current) return;
    if (new URLSearchParams(window.location.search).get("edit")) return;
    draftRestored.current = true;
    const draft = readListingDraft();
    if (!draft) return;
    setStep(draft.step);
    setType(draft.type);
    setCategoryId(draft.categoryId);
    setTitle(draft.title);
    setDescription(draft.description);
    setPrice(draft.price);
    setCity(draft.city);
    setDistrict(draft.district);
    setNeighborhood(draft.neighborhood);
    setImages(draft.images);
    setAttrs(draft.attrs);
    setFeatures(draft.features);
    setChassis(draft.chassis);
  }, [hydrated, user, editId]);

  useEffect(() => {
    if (!hydrated || !user || editId) return;
    writeListingDraft({
      step,
      type,
      categoryId,
      title,
      description,
      price,
      city,
      district,
      neighborhood,
      images,
      attrs,
      features,
      chassis,
    });
  }, [
    hydrated,
    user,
    editId,
    step,
    type,
    categoryId,
    title,
    description,
    price,
    city,
    district,
    neighborhood,
    images,
    attrs,
    features,
    chassis,
  ]);

  useEffect(() => {
    setPreviewPhoto(0);
  }, [images]);

  useEffect(() => {
    if (!city || !district || (editId && !editReady) || geo?.key === locKey) return;
    let alive = true;
    const timer = setTimeout(() => {
      void resolveGeo(locKey).then((coords) => {
        if (alive && coords) setGeo({ key: locKey, ...coords });
      });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [city, district, locKey, editId, editReady, geo?.key, resolveGeo]);

  useEffect(() => {
    if (editId && !editReady) return;
    if (type === "vasita" && (categoryId === "vasita" || categoryId === "phones")) {
      setCategoryId("vasita-otomobil");
      return;
    }
    if (type === "emlak" && (categoryId === "emlak" || categoryId === "phones")) {
      setCategoryId("emlak-konut-satilik-daire");
      return;
    }
    if (type === "parca" && (categoryId === "parts" || categoryId === "phones")) {
      setCategoryId("parts-auto-spare-auto");
      return;
    }
    if (!typeCats.some((c) => c.id === categoryId) && typeCats[0]) {
      setCategoryId(type === "vasita" ? "vasita-otomobil" : typeCats[0].id);
    }
  }, [typeCats, categoryId, editId, editReady, type]);

  useEffect(() => {
    if (editId && !editReady) return;
    if (schema.family !== "vasita") {
      autoEquipRef.current = [];
      setAutoEquipNote(false);
      return;
    }
    const combo = equipmentForVehicleCombo({
      brand: attrs.brand,
      model: attrs.model,
      trim: attrs.trim,
      engine: attrs.engine,
      body: attrs.body,
      year: attrs.year,
      segment: schema.catalogKind,
    });
    if (!combo?.length) {
      if (autoEquipRef.current.length) {
        const drop = new Set(autoEquipRef.current);
        setFeatures((prev) => prev.filter((item) => !drop.has(item)));
      }
      autoEquipRef.current = [];
      setAutoEquipNote(false);
      return;
    }
    setFeatures((prev) => {
      const drop = new Set(autoEquipRef.current);
      const kept = prev.filter((item) => !drop.has(item));
      autoEquipRef.current = combo;
      return [...new Set([...kept, ...combo])];
    });
    setAutoEquipNote(true);
  }, [
    attrs.brand,
    attrs.model,
    attrs.trim,
    attrs.engine,
    attrs.body,
    attrs.year,
    schema.family,
    schema.catalogKind,
    editId,
    editReady,
  ]);

  function goToDetails() {
    if (images.length < MIN_PHOTOS) {
      setPhotoHint(t("photo.minN", { min: MIN_PHOTOS }));
      return;
    }
    setPhotoHint("");
    setFormHint("");
    setStep(1);
  }

  function setAttr(key: string, value: string) {
    setAttrs((prev) => {
      const next = { ...prev, [key]: value };
      const cascade: Record<string, string[]> = {
        brand: ["model", "trim", "engine", "body", "range", "year"],
        model: ["trim", "engine", "body", "range", "year"],
        trim: ["engine", "body", "range", "year"],
        engine: ["body", "range", "year"],
        body: ["year"],
      };
      for (const child of cascade[key] ?? []) next[child] = "";
      return next;
    });
  }

  function resetType(next: string) {
    setType(next);
    setCategoryId(
      next === "vasita"
        ? "vasita-otomobil"
        : next === "emlak"
          ? "emlak-konut-satilik-daire"
          : next === "parca"
            ? "parts-auto-spare-auto"
            : typeToCategory(next),
    );
    setAttrs({});
    setFeatures([]);
    setAutoEquipNote(false);
    autoEquipRef.current = [];
    setChassis(emptyChassis());
    setFormHint("");
  }

  function toggleFeature(item: string) {
    setFeatures((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  }

  function buildSpecs() {
    const specs = specsWithChassis(schema, attrs, chassis);
    if (schema.family === "emlak") {
      const deal = estateDealFromCategoryId(categoryId);
      const homeType = estateHomeTypeFromCategoryId(categoryId);
      if (deal && !specs.some((s) => s.label === "İlan tipi")) specs.push({ label: "İlan tipi", value: deal });
      if (homeType && !specs.some((s) => s.label === "Emlak tipi")) specs.push({ label: "Emlak tipi", value: homeType });
    }
    const partType = partsVehicleTypeFromId(categoryId);
    if (partType && !specs.some((s) => s.label === "Tipi")) specs.push({ label: "Tipi", value: partType });
    const gearProduct = motoGearProductFromId(categoryId);
    if (gearProduct && !specs.some((s) => s.label === "Ürün")) specs.push({ label: "Ürün", value: gearProduct });
    return specs;
  }

  function validateStep0() {
    if (images.length < MIN_PHOTOS) return t("photo.minN", { min: MIN_PHOTOS });
    if (!title.trim()) return t("post.needTitle");
    if (parseListingPrice(price) == null) return t("post.needPrice");
    if (!city) return t("post.needCity");
    if (!district) return t("post.needDist");
    const banned = moderateListingDraft({ title, description, categoryId, images });
    if (banned.blocked) return t(banned.reason ?? "mod.animal");
    const missing = schema.fields.filter((f) => f.required && !attrs[f.key]?.trim());
    if (missing.length) return t("post.needSchema");
    return "";
  }

  function goLogin(errorKey = "auth.err.session") {
    const listingPath = `/ilan-ver${typeof window !== "undefined" ? window.location.search : ""}`;
    setFormHint(t(errorKey));
    showFlashToast(t(errorKey), "err");
    router.push(`/giris?next=${encodeURIComponent(listingPath)}`);
  }

  async function publish() {
    if (publishLock.current || publishing) return;
    const listingPath = `/ilan-ver${window.location.search}`;
    if (!user) {
      goLogin();
      return;
    }
    if (!isProfileComplete(user)) {
      router.push(`${COMPLETE_PATH}?next=${encodeURIComponent(listingPath)}`);
      return;
    }
    const step0 = validateStep0();
    if (step0) {
      setFormHint(step0);
      return;
    }
    const amount = parseListingPrice(price);
    if (amount == null) {
      setFormHint(t("post.needPrice"));
      return;
    }
    const banned = moderateListingDraft({ title, description, categoryId, images });
    if (banned.blocked) {
      setFormHint(t(banned.reason ?? "mod.animal"));
      return;
    }
    if (images.length < MIN_PHOTOS) {
      setFormHint(t("photo.minN", { min: MIN_PHOTOS }));
      return;
    }
    const specs = buildSpecs();
    publishLock.current = true;
    setPublishing(true);
    setFormHint("");
    try {
      const coords =
        geo?.key === locKey
          ? { lat: geo.lat, lng: geo.lng }
          : await Promise.race([
              resolveGeo(locKey),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
            ]);
      if (editing) {
        const saved = await updateListing(editing.id, {
          title: title || t("post.new"),
          subtitle: `${types.find((item) => item.id === type)?.label} · ${city} / ${district}${neighborhood ? ` / ${neighborhood}` : ""}`,
          price: amount,
          categoryId,
          city,
          district,
          neighborhood,
          lat: coords?.lat,
          lng: coords?.lng,
          images,
          description: description || t("post.nodesc"),
          specs,
          features,
          chassis: schema.chassis ? chassis : undefined,
          ...(urgentAllowed ? { urgent } : {}),
        });
        if (!saved.ok) {
          if (saved.error === "auth.err.session") {
            goLogin();
            return;
          }
          setFormHint(t(saved.error ?? "mod.animal"));
          return;
        }
        clearListingDraft();
        router.push(`/ilan/${editing.id}`);
        return;
      }
      const listing: Listing = {
        id: publishIdRef.current,
        title: title || t("post.new"),
        subtitle: `${types.find((item) => item.id === type)?.label} · ${city} / ${district}${neighborhood ? ` / ${neighborhood}` : ""}`,
        price: amount,
        categoryId,
        city,
        district,
        neighborhood,
        lat: coords?.lat,
        lng: coords?.lng,
        images,
        description: description || t("post.nodesc"),
        sellerId: user.id,
        sellerName: user.displayName,
        sellerAvatar: user.avatar,
        sellerVerified: user.verified,
        createdAt: "şimdi",
        views: 0,
        featured: listingIsPromoted(live),
        vip: live?.plan === "vip" || listingIsPromoted(live),
        status: "active",
        specs,
        features,
        chassis: schema.chassis ? chassis : undefined,
        listingNo: String(Math.floor(10000000 + Math.random() * 89999999)),
        postedAt: Date.now(),
        expiresAt: expiresAtForUser(live),
        urgent: urgentAllowed && urgent,
      };
      const posted = await addListing(listing);
      if (!posted.ok) {
        if (posted.error === "auth.err.session" || posted.status === 401) {
          goLogin();
          return;
        }
        setFormHint(
          t(posted.error === "quota.exhausted" ? "quota.exhausted" : posted.error ?? "mod.animal", {
            min: MIN_PHOTOS,
          }),
        );
        return;
      }
      clearListingDraft();
      const saved = posted.listing;
      const published = saved?.status !== "pending";
      showFlashToast(t(published ? "post.publishedOk" : "post.pendingOk"), "ok");
      router.push(`/ilan/${saved?.id ?? listing.id}${published ? `?${PUBLISHED_PARAM}=1` : ""}`);
    } finally {
      publishLock.current = false;
      setPublishing(false);
    }
  }

  if (!hydrated) {
    return <div className="post-page mx-auto max-w-3xl px-3 py-8 text-center text-sm text-muted">…</div>;
  }
  if (!user) {
    return null;
  }

  return (
    <div className="post-page mx-auto max-w-3xl px-3 py-4 sm:px-4">
      <h1 className="mb-4 text-center text-xl font-bold text-ink">{editing ? t("post.edit") : t("post.h")}</h1>
      {user && !editing ? (
        <div className="mb-4">
          <EntitlementStatus />
        </div>
      ) : null}
      {!allowed && !editing ? (
        <div className="rounded-xl border border-orange/40 bg-card p-5 text-center shadow-sm">
          <p className="text-lg font-extrabold text-ink">{t("quota.exhausted")}</p>
          <p className="mt-2 text-sm text-muted">{t("quota.needPack")}</p>
        </div>
      ) : (
        <>
      <div className="post-steps mb-6 flex items-start justify-center">
        {steps.map((s, i) => (
          <div key={s} className="flex min-w-0 flex-1 items-center last:flex-none sm:flex-none">
            <div className="flex min-w-0 flex-col items-center">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  i <= step ? "btn-primary !h-8 !w-8" : "bg-elev text-muted"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="post-step-label mt-1 text-center text-[10px] leading-tight text-muted">{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`post-step-line mx-1 h-0.5 sm:mx-2 ${i < step ? "bg-lime" : "bg-line"}`} />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div className="post-types">
            {types.map((item) => {
              const Icon = item.icon;
              const on = type === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => resetType(item.id)}
                  className={`post-type-btn flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-3 text-xs shadow-sm ${
                    on ? "border-lime bg-lime/10 text-lime" : "border-line bg-card text-ink"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
          <Field label={t("post.cat")}>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setAttrs({});
                setFeatures([]);
                setChassis(emptyChassis());
                setFormHint("");
              }}
              className="h-12 w-full rounded-xl border border-line bg-panel px-3 text-sm text-ink shadow-sm"
            >
              {typeCats.map((c) => {
                const p = parentOf(c);
                const gp = p ? parentOf(p) : undefined;
                const bits = [gp && gp.id !== "emlak" && gp.parentId ? gp.name : null, p && p.id !== typeToCategory(type) ? p.name : null, c.name].filter(
                  Boolean,
                );
                return (
                  <option key={c.id} value={c.id}>
                    {bits.join(" › ")}
                  </option>
                );
              })}
            </select>
          </Field>
          {isPetsCategoryId(categoryId) ? (
            <p className="rounded-xl border border-lime/25 bg-lime/10 px-3 py-2 text-xs leading-relaxed text-ink">
              {t("cat.pets.policy")}
            </p>
          ) : null}
          <PhotoUploader images={images} onChange={setImages} categoryId={categoryId} />
          {photoHint && <p className="text-xs text-orange">{photoHint}</p>}
          <button type="button" onClick={goToDetails} className="btn-primary h-12 w-full">
            {t("post.next")}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-line bg-card p-3 shadow-sm">
            <p className="text-xs font-bold text-ink">{t("post.dyn")}</p>
            <DynamicAttributeForm schema={schema} attrs={attrs} onChange={setAttr} />
          </div>

          {schema.chassis ? (
            <div className="rounded-xl border border-line bg-card p-3 shadow-sm">
              <p className="mb-2 text-xs font-bold text-ink">{t("post.chassis")}</p>
              <ChassisMap value={chassis} onChange={setChassis} />
            </div>
          ) : null}

          {schema.groups.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-bold text-ink">{t("post.features")}</p>
              {autoEquipNote ? (
                <p className="mb-2 rounded-xl border border-line bg-elev px-3 py-2 text-[11px] leading-snug text-ink">
                  {t("post.autoEquip")}
                </p>
              ) : null}
              <FeatureGrid groups={schema.groups} selected={features} onToggle={toggleFeature} />
            </div>
          ) : null}

          <Field label={t("post.title")}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={listingTitlePlaceholder(categoryId, t("post.phPrefix"), attrs)}
              className="h-12 w-full rounded-xl border border-line bg-panel px-3 text-sm text-ink shadow-sm"
            />
          </Field>
          <Field label={t("post.body")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={listingBodyPlaceholder(categoryId)}
              rows={5}
              className="w-full rounded-xl border border-line bg-panel px-3 py-3 text-sm text-ink shadow-sm"
            />
          </Field>
          <Field label={t("post.price")}>
            <div className="relative">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="0"
                inputMode="numeric"
                maxLength={12}
                className="h-12 w-full rounded-xl border border-line bg-panel px-3 pe-12 text-sm text-ink shadow-sm"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted">TL</span>
            </div>
          </Field>
          <SearchSelect
            label={t("post.city")}
            value={city}
            options={cityNames}
            placeholder={t("post.phCity")}
            onChange={(v) => {
              setCity(v);
              setDistrict("");
              setNeighborhood("");
            }}
          />
          <SearchSelect
            label={t("post.district")}
            value={district}
            options={districts}
            disabled={!city}
            placeholder={city ? t("post.phDist") : t("post.phDistFirst")}
            onChange={(v) => {
              setDistrict(v);
              setNeighborhood("");
            }}
          />
          {type === "emlak" ? (
            <SearchSelect
              label={t("post.neighborhood")}
              value={neighborhood}
              options={mahalleler}
              disabled={!district}
              placeholder={district ? t("post.phHood") : t("flt.districtFirst")}
              onChange={setNeighborhood}
            />
          ) : null}
          {formHint && <p className="text-xs text-orange">{formHint}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setStep(0)} className="h-12 rounded-xl border border-line">
              {t("post.back")}
            </button>
            <button
              type="button"
              onClick={() => {
                const err = validateStep0();
                if (err) {
                  setFormHint(err);
                  return;
                }
                setFormHint("");
                setStep(2);
              }}
              className="btn-primary h-12"
            >
              {t("post.next")}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <ListingPreview
            images={images}
            previewPhoto={previewPhoto}
            onPickPhoto={setPreviewPhoto}
            title={title || t("post.untitled")}
            priceLabel={formatMoney(parseListingPrice(price) ?? 0)}
            description={description}
            city={city}
            district={district}
            neighborhood={neighborhood}
            categoryLabel={categoryPathLabel(categoryId, t)}
            specs={buildSpecs().filter((s) => s.value?.trim())}
            featureGroups={schema.groups}
            features={features}
            featuresOpen={featuresOpen}
            onToggleFeatures={() => setFeaturesOpen((v) => !v)}
            t={t}
          />
          <UrgentOption business={business} value={urgentAllowed && urgent} onChange={setUrgent} />
          {formHint ? <p className="text-xs text-orange">{formHint}</p> : null}
          <div className="post-preview-actions">
            <button type="button" onClick={() => setStep(1)} className="h-12 rounded-xl border border-line" disabled={publishing}>
              {t("post.back")}
            </button>
            <button type="button" onClick={() => void publish()} className="btn-primary h-12" disabled={publishing}>
              {publishing ? t("post.publishing") : editing ? t("post.save") : t("post.publishFull")}
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function flattenTree(list: Category[]): Category[] {
  const out: Category[] = [];
  for (const c of list) {
    out.push(c);
    if (c.children?.length) out.push(...flattenTree(c.children));
  }
  return out;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink">{label}</span>
      {children}
    </label>
  );
}

const DRAFT_KEY = "alsatport-listing-draft";

type ListingDraft = {
  step: number;
  type: string;
  categoryId: string;
  title: string;
  description: string;
  price: string;
  city: string;
  district: string;
  neighborhood: string;
  images: string[];
  attrs: Record<string, string>;
  features: string[];
  chassis: Record<string, ChassisStatus>;
};

function readListingDraft(): ListingDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ListingDraft;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeListingDraft(draft: ListingDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

function clearListingDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function categoryPathLabel(categoryId: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const cat = findCategory(categoryId);
  if (!cat) return categoryId;
  const bits: string[] = [];
  let node: Category | undefined = cat;
  while (node) {
    bits.unshift(catName(t, node.id, node.name));
    node = parentOf(node);
  }
  return bits.join(" › ");
}

function ListingPreview({
  images,
  previewPhoto,
  onPickPhoto,
  title,
  priceLabel,
  description,
  city,
  district,
  neighborhood,
  categoryLabel,
  specs,
  featureGroups,
  features,
  featuresOpen,
  onToggleFeatures,
  t,
}: {
  images: string[];
  previewPhoto: number;
  onPickPhoto: (i: number) => void;
  title: string;
  priceLabel: string;
  description: string;
  city: string;
  district: string;
  neighborhood: string;
  categoryLabel: string;
  specs: { label: string; value: string }[];
  featureGroups: { id: string; title: string; items: string[] }[];
  features: string[];
  featuresOpen: boolean;
  onToggleFeatures: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const cover = images[previewPhoto] || images[0];
  const selectedGroups = featureGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => features.includes(item)) }))
    .filter((group) => group.items.length);

  return (
    <div className="post-preview">
      <p className="post-preview-kicker">{t("post.preview")}</p>
      {cover ? (
        <div className="post-preview-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" />
        </div>
      ) : null}
      {images.length > 1 ? (
        <div className="post-preview-thumbs">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className={`post-preview-thumb ${i === previewPhoto ? "is-on" : ""}`}
              onClick={() => onPickPhoto(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      <p className="post-preview-count">{t("post.photosN", { n: images.length })}</p>
      <h2 className="post-preview-title">{title}</h2>
      <p className="post-preview-price">{priceLabel}</p>
      <p className="post-preview-meta">
        {city} / {district}
        {neighborhood ? ` / ${neighborhood}` : ""}
      </p>
      <p className="post-preview-meta">{categoryLabel}</p>
      {description ? <p className="post-preview-body">{description}</p> : null}
      {specs.length ? (
        <ul className="post-preview-specs">
          {specs.map((s) => (
            <li key={s.label}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </li>
          ))}
        </ul>
      ) : null}
      {features.length > 0 ? (
        <div className="post-preview-feats">
          <p>{t("post.featN", { n: features.length })}</p>
          <button type="button" className="post-preview-feats-toggle" onClick={onToggleFeatures}>
            {featuresOpen ? t("post.hideFeatures") : t("post.seeFeatures")}
          </button>
          {featuresOpen ? <FeatureGrid groups={selectedGroups} selected={features} readOnly /> : null}
        </div>
      ) : null}
    </div>
  );
}
