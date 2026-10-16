"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";
import { categories, findCategory, type Category } from "@/data/categories";
import { useApp } from "@/context/AppContext";
import type { Listing } from "@/data/store";
import { PhotoUploader, MIN_PHOTOS } from "@/components/PhotoUploader";
import { COMPLETE_PATH, isProfileComplete } from "@/lib/profile";
import { districtsOf } from "@/data/turkey";
import { COUNTRIES, type Country, countryOfCity, isKnownCity, regionNamesFor } from "@/data/locations";
import { KKTC_VEHICLE_FIELDS, kktcFieldsForSegment } from "@/data/kktcVehicle";
import {
  LISTING_CURRENCIES,
  type ListingCurrency,
  defaultCurrencyForCountry,
  listingCurrencyOf,
  listingCurrencySymbol,
} from "@/lib/listings/currency";
import { mahallelerOf } from "@/data/regionProfiles";
import { equipmentForVehicleCombo, typeToCategory, typeFromCategoryId } from "@/data/listingOptions";
import { listingBodyPlaceholder, listingTitlePlaceholder } from "@/data/listingCopy";
import { canPublishListing, expiresAtForUser, listingIsPromoted } from "@/lib/listingQuota";
import { parseListingPrice } from "@/lib/listingPrice";
import { reconcileEntitlements } from "@/lib/entitlements";
import { EntitlementStatus } from "@/components/EntitlementStatus";
import {
  dependentAttrKeys,
  editAttrValue,
  missingRequiredAttrs,
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
import { DynamicAttributeForm, carryAttrs, staleCatalogAttrs } from "@/components/DynamicAttributeForm";
import { VehicleRequestBox, useApprovedVehicles } from "@/components/VehicleRequestBox";
import { ChassisMap } from "@/components/ChassisMap";
import { FeatureGrid } from "@/components/FeatureGrid";
import { catName, useI18n } from "@/context/I18nContext";
import { isPetsCategoryId, moderateListingDraft } from "@/lib/liveAnimalPolicy";
import { UrgentOption } from "@/components/business/UrgentOption";
import { useOwnBusiness } from "@/components/business/useOwnBusiness";
import { CategoryPicker, categoryTrail, isPostableLeaf } from "@/components/post/CategoryPicker";
import { PostActionBar, PostStepper } from "@/components/post/PostWizardChrome";
import { PostPreview } from "@/components/post/PostPreview";
import { PostSuccess } from "@/components/post/PostSuccess";

type StepId = "kategori" | "bilgiler" | "detaylar" | "fotograflar" | "fiyat" | "aciklama" | "onizleme";
type Problem = { msg: string; target?: string; invalid?: string[] };

const TITLE_MAX = 120;
const BODY_MAX = 8000;
const POST_TYPES = ["urun", "vasita", "emlak", "parca", "makine", "hizmet", "ders", "is", "hayvan", "yardim"];

export default function PostListingPage() {
  const { user, addListing, updateListing, listings, hydrated, sessionIssue } = useApp();
  const { t, formatMoney } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<StepId>("kategori");
  const [reached, setReached] = useState(0);
  const [type, setType] = useState("urun");
  const [categoryId, setCategoryId] = useState("phones");
  /** The category was really picked (by the user, a draft, an edited listing or /ilan-ver?type=…). */
  const [catChosen, setCatChosen] = useState(false);
  const [startRoot, setStartRoot] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<ListingCurrency>("TRY");
  /** Set once the currency comes from the user, a draft or the edited listing; the country default never overrides it. */
  const [currencyChosen, setCurrencyChosen] = useState(false);
  const [city, setCity] = useState("İstanbul");
  const [district, setDistrict] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [geo, setGeo] = useState<{ key: string; lat: number; lng: number } | null>(null);
  const geoReq = useRef<{ key: string; promise: Promise<{ lat: number; lng: number } | null> } | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [formHint, setFormHint] = useState("");
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [missingAttrs, setMissingAttrs] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [chassis, setChassis] = useState<Record<string, ChassisStatus>>(emptyChassis());
  const [autoEquipNote, setAutoEquipNote] = useState(false);
  const autoEquipRef = useRef<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editReady, setEditReady] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState<Listing | null>(null);
  const [urgent, setUrgent] = useState(false);
  const { business } = useOwnBusiness();
  const urgentAllowed = business?.status === "approved";
  const publishLock = useRef(false);
  const publishIdRef = useRef(crypto.randomUUID());
  const draftRestored = useRef(false);
  /** Remounts the category picker only when a draft or an edited listing replaced the category. */
  const [pickerKey, setPickerKey] = useState(0);

  const typeLabel: Record<string, string> = {
    urun: t("post.urun"),
    vasita: t("post.vasita"),
    emlak: t("post.emlak"),
    parca: t("post.parca"),
    makine: t("post.makine"),
    hizmet: t("post.hizmet"),
    ders: t("post.ders"),
    is: t("post.is"),
    hayvan: t("post.hayvan"),
    yardim: t("post.yardim"),
  };

  const editing = useMemo(
    () => (editId && user ? listings.find((l) => l.id === editId && l.sellerId === user.id) : undefined),
    [editId, listings, user],
  );

  const live = user ? reconcileEntitlements(user) : null;
  const allowed = canPublishListing(live);
  const [countryPick, setCountryPick] = useState<Country>("TR");
  const country: Country = countryOfCity(city) ?? countryPick;
  const isKktc = country === "KKTC";
  useEffect(() => {
    if (currencyChosen || editId) return;
    setCurrency(defaultCurrencyForCountry(country));
  }, [country, currencyChosen, editId]);
  const cityNames = useMemo(() => regionNamesFor(country), [country]);
  const districts = useMemo(() => districtsOf(city), [city]);
  const mahalleler = useMemo(() => mahallelerOf(city, district), [city, district]);
  const schema = useMemo(() => schemaForCategoryId(categoryId), [categoryId]);
  const approvedVehicles = useApprovedVehicles(Boolean(schema.catalogKind));
  const kktcFields = useMemo(
    () => (isKktc && schema.family === "vasita" ? kktcFieldsForSegment(schema.catalogKind ?? "auto") : []),
    [isKktc, schema.family, schema.catalogKind],
  );
  const locKey = `${city}|${district}|${neighborhood}`;
  const categoryOk = catChosen && (isPostableLeaf(categoryId) || (!!editing && categoryId === editing.categoryId));

  const stepIds = useMemo(() => {
    const ids: StepId[] = ["kategori"];
    if (schema.fields.length) ids.push("bilgiler");
    if (schema.chassis || schema.groups.length) ids.push("detaylar");
    ids.push("fotograflar", "fiyat", "aciklama", "onizleme");
    return ids;
  }, [schema]);
  const stepIndex = Math.max(0, stepIds.indexOf(step));
  const stepLabels: Record<StepId, string> = {
    kategori: t("post.st.cat"),
    bilgiler: schema.family === "vasita" ? t("post.st.vehicle") : t("post.st.info"),
    detaylar: t("post.st.details"),
    fotograflar: t("post.s0"),
    fiyat: t("post.st.price"),
    aciklama: t("post.st.text"),
    onizleme: t("post.preview"),
  };

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

  // The wizard has its own bottom bar; the site tab bar would sit on top of it.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("post-wizard");
    return () => html.classList.remove("post-wizard");
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setEditId(q.get("edit"));
    if (q.get("edit")) return;
    if (q.get("acil") === "1") setUrgent(true);
    const typeQ = q.get("type");
    const cityQ = q.get("city");
    if (typeQ && POST_TYPES.includes(typeQ)) {
      setType(typeQ);
      setCatChosen(true);
      setStartRoot(typeToCategory(typeQ));
    }
    if (cityQ && isKnownCity(cityQ)) setCity(cityQ);
  }, []);

  useEffect(() => {
    if (!hydrated || editReady || !editing) return;
    const sch = schemaForCategoryId(editing.categoryId);
    const nextAttrs: Record<string, string> = {};
    for (const f of sch.fields) {
      const hit = editing.specs.find((s) => s.label === f.specLabel || s.label === f.label);
      if (hit) nextAttrs[f.key] = editAttrValue(f, hit.value, sch.vehicleProfile);
    }
    for (const f of KKTC_VEHICLE_FIELDS) {
      const hit = editing.specs.find((s) => s.label === f.specLabel);
      if (hit) nextAttrs[`${KKTC_ATTR}${f.key}`] = hit.value;
    }
    setCurrency(listingCurrencyOf(editing.currency));
    setCurrencyChosen(true);
    setType(typeFromCategoryId(editing.categoryId));
    setCategoryId(editing.categoryId);
    setCatChosen(true);
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
    setFeatures(editing.features ?? []);
    setChassis(editing.chassis ?? emptyChassis());
    setAttrs(nextAttrs);
    setUrgent(!!editing.urgent);
    setStep(sch.fields.length ? "bilgiler" : "fotograflar");
    setReached(99);
    setEditReady(true);
    setPickerKey((k) => k + 1);
  }, [hydrated, editReady, editing]);

  useEffect(() => {
    if (!hydrated || !user || editId || draftRestored.current) return;
    if (new URLSearchParams(window.location.search).get("edit")) return;
    draftRestored.current = true;
    const draft = readListingDraft();
    if (!draft) return;
    setStep(draft.step);
    setReached(draft.reached);
    setType(draft.type);
    setCategoryId(draft.categoryId);
    setCatChosen(draft.catChosen);
    setTitle(draft.title);
    setDescription(draft.description);
    setPrice(draft.price);
    setCurrency(listingCurrencyOf(draft.currency));
    if (draft.currency) setCurrencyChosen(true);
    setCity(draft.city);
    setDistrict(draft.district);
    setNeighborhood(draft.neighborhood);
    setImages(draft.images);
    setAttrs(draft.attrs);
    setFeatures(draft.features);
    setChassis(draft.chassis);
    if (draft.publishId) publishIdRef.current = draft.publishId;
    setPickerKey((k) => k + 1);
  }, [hydrated, user, editId]);

  useEffect(() => {
    if (!hydrated || !user || editId || done) return;
    writeListingDraft({
      step,
      reached,
      type,
      categoryId,
      catChosen,
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
      currency: currencyChosen ? currency : undefined,
      publishId: publishIdRef.current,
    });
  }, [
    hydrated,
    user,
    editId,
    done,
    step,
    reached,
    type,
    categoryId,
    catChosen,
    title,
    description,
    price,
    currency,
    currencyChosen,
    city,
    district,
    neighborhood,
    images,
    attrs,
    features,
    chassis,
  ]);

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

  // A step that disappears (the new category has no equipment list) falls back to the closest one.
  useEffect(() => {
    if (!stepIds.includes(step)) setStep(stepIds[Math.min(stepIds.length - 1, Math.max(1, reached))] ?? "kategori");
  }, [stepIds, step, reached]);

  function setAttr(key: string, value: string) {
    if (value) setMissingAttrs((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : prev));
    setAttrs((prev) => {
      const next = { ...prev, [key]: value };
      const cascade: Record<string, string[]> = {
        brand: ["model", "trim", "engine", "body", "range"],
        model: ["trim", "engine", "body", "range"],
        trim: ["engine", "body", "range"],
        engine: ["body", "range"],
      };
      const children = schema.vehicleProfile ? dependentAttrKeys(schema, key) : (cascade[key] ?? []);
      for (const child of children) next[child] = "";
      return next;
    });
  }

  /** Keeps whatever still fits the new category (title, price, place, photos, matching attributes). */
  function pickCategory(id: string) {
    setFormHint("");
    if (id === categoryId && catChosen) return;
    const next = schemaForCategoryId(id);
    setType(typeFromCategoryId(id));
    setCategoryId(id);
    setCatChosen(true);
    setAttrs((prev) => {
      const kept = carryAttrs(prev, next, approvedVehicles);
      if (next.family === "vasita") {
        for (const [k, v] of Object.entries(prev)) if (k.startsWith(KKTC_ATTR) && v) kept[k] = v;
      }
      return kept;
    });
    setFeatures((prev) => prev.filter((f) => next.groups.some((g) => g.items.includes(f))));
    if (!next.chassis) setChassis(emptyChassis());
    setMissingAttrs([]);
    setReached(0);
  }

  function toggleFeature(item: string) {
    setFeatures((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  }

  function buildSpecs() {
    const specs = specsWithChassis(schema, attrs, chassis, currency);
    for (const f of kktcFields) {
      const value = attrs[`${KKTC_ATTR}${f.key}`]?.trim();
      if (value && !specs.some((s) => s.label === f.specLabel)) specs.push({ label: f.specLabel, value });
    }
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

  function checkStep(id: StepId): Problem | null {
    if (id === "kategori") return categoryOk ? null : { msg: t("post.needCat"), target: ".cat-pick" };
    if (id === "bilgiler") {
      const missing = missingRequiredAttrs(schema, attrs);
      const stale = staleCatalogAttrs(schema, attrs, approvedVehicles);
      const invalid = [...missing, ...stale].map((f) => f.key);
      if (missing.length) {
        return {
          msg: t("post.needSchemaFields", { fields: missing.map((f) => f.label).join(", ") }),
          target: `[data-attr-key="${missing[0].key}"]`,
          invalid,
        };
      }
      if (stale.length) {
        return {
          msg: t("post.staleFields", { fields: stale.map((f) => f.label).join(", ") }),
          target: `[data-attr-key="${stale[0].key}"]`,
          invalid,
        };
      }
      return null;
    }
    if (id === "fotograflar") {
      if (photosBusy) return { msg: t("photo.waitUpload"), target: ".photo-grid" };
      if (images.length < MIN_PHOTOS) return { msg: t("photo.minN", { min: MIN_PHOTOS }), target: ".photo-up" };
      const banned = moderateListingDraft({ title: "", description: "", categoryId, images });
      return banned.blocked ? { msg: t(banned.reason ?? "mod.animal"), target: ".photo-up" } : null;
    }
    if (id === "fiyat") {
      if (parseListingPrice(price) == null) return { msg: t("post.needPrice"), target: '[data-field="price"]' };
      if (!city) return { msg: t("post.needCity"), target: '[data-field="city"]' };
      if (!district) return { msg: t("post.needDist"), target: '[data-field="district"]' };
      return null;
    }
    if (id === "aciklama") {
      if (!title.trim()) return { msg: t("post.needTitle"), target: '[data-field="title"]' };
      const banned = moderateListingDraft({ title, description, categoryId, images });
      return banned.blocked ? { msg: t(banned.reason ?? "mod.animal"), target: '[data-field="title"]' } : null;
    }
    return null;
  }

  // A warning goes away as soon as the user fixes what it names, even if the step still has another gap
  // (that one is shown on the next Devam). Server errors on the preview stay.
  useEffect(() => {
    if (!formHint || step === "onizleme") return;
    const problem = checkStep(step);
    if (problem?.msg === formHint) return;
    setFormHint("");
    setMissingAttrs(problem?.invalid ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, city, district, title, description, images, attrs, catChosen, categoryId, photosBusy, step]);

  /** Shows the message and scrolls the field into view without focusing it, so no keyboard or list pops open. */
  function showProblem(id: StepId, problem: Problem) {
    setStep(id);
    setFormHint(problem.msg);
    if (problem.invalid) setMissingAttrs(problem.invalid);
    window.setTimeout(() => {
      if (problem.target) document.querySelector(problem.target)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
  }

  function goTo(id: StepId) {
    setFormHint("");
    setStep(id);
    const i = stepIds.indexOf(id);
    setReached((r) => Math.max(r, i));
    window.setTimeout(() => window.scrollTo({ top: 0 }), 0);
  }

  function next() {
    const problem = checkStep(step);
    if (problem) {
      showProblem(step, problem);
      return;
    }
    const target = stepIds[stepIndex + 1];
    if (target) goTo(target);
  }

  function back() {
    const target = stepIds[stepIndex - 1];
    if (target) goTo(target);
  }

  function validateAll() {
    for (const id of stepIds) {
      if (id === "onizleme") break;
      const problem = checkStep(id);
      if (problem) {
        showProblem(id, problem);
        return false;
      }
    }
    return true;
  }

  function goLogin(errorKey = "auth.err.session") {
    const listingPath = `/ilan-ver${typeof window !== "undefined" ? window.location.search : ""}`;
    setFormHint(t(errorKey));
    router.push(`/giris?next=${encodeURIComponent(listingPath)}`);
  }

  function startOver() {
    clearListingDraft();
    publishIdRef.current = crypto.randomUUID();
    setDone(null);
    setStep("kategori");
    setReached(0);
    setCatChosen(false);
    setStartRoot(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setImages([]);
    setAttrs({});
    setMissingAttrs([]);
    setFeatures([]);
    setChassis(emptyChassis());
    setDistrict("");
    setNeighborhood("");
    setUrgent(false);
    setFormHint("");
    window.scrollTo({ top: 0 });
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
    if (!validateAll()) return;
    const amount = parseListingPrice(price);
    if (amount == null) {
      showProblem("fiyat", { msg: t("post.needPrice"), target: '[data-field="price"]' });
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
      const subtitle = `${typeLabel[type] ?? ""} · ${city} / ${district}${neighborhood ? ` / ${neighborhood}` : ""}`;
      if (editing) {
        const saved = await updateListing(editing.id, {
          title: title || t("post.new"),
          subtitle,
          price: amount,
          currency,
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
          setFormHint(t(saved.error ?? "auth.err.server"));
          return;
        }
        clearListingDraft();
        router.push(`/ilan/${editing.id}`);
        return;
      }
      const listing: Listing = {
        id: publishIdRef.current,
        title: title || t("post.new"),
        subtitle,
        price: amount,
        currency,
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
          t(posted.error === "quota.exhausted" ? "quota.exhausted" : posted.error ?? "auth.err.server", {
            min: MIN_PHOTOS,
          }),
        );
        return;
      }
      clearListingDraft();
      setDone(posted.listing ?? listing);
      window.scrollTo({ top: 0 });
    } finally {
      publishLock.current = false;
      setPublishing(false);
    }
  }

  if (!hydrated || (!user && sessionIssue)) {
    return <div className="post-page mx-auto max-w-3xl px-3 py-8 text-center text-sm text-muted">…</div>;
  }
  if (!user) {
    return null;
  }

  if (done) {
    return (
      <div className="post-page is-done mx-auto max-w-xl px-3 py-4 sm:px-4">
        <PostSuccess listing={done} onNew={startOver} />
      </div>
    );
  }

  const blocked = !allowed && !editing;
  const pathLabel = categoryPathLabel(categoryId, t);

  return (
    <div className="post-page mx-auto max-w-3xl px-3 py-4 sm:px-4" data-post-step={step}>
      <div className="post-top">
        <h1 className="post-h1">{editing ? t("post.edit") : t("post.h")}</h1>
        {!blocked ? (
          <PostStepper
            steps={stepIds.map((id) => ({ id, label: stepLabels[id] }))}
            current={stepIndex}
            reached={Math.min(reached, stepIds.length - 1)}
            onJump={(i) => goTo(stepIds[i])}
          />
        ) : null}
      </div>

      {blocked ? (
        <>
          <div className="mb-4">
            <EntitlementStatus />
          </div>
          <div className="rounded-xl border border-orange/40 bg-card p-5 text-center shadow-sm">
            <p className="text-lg font-extrabold text-ink">{t("quota.exhausted")}</p>
            <p className="mt-2 text-sm text-muted">{t("quota.needPack")}</p>
          </div>
        </>
      ) : (
        <>
          {step === "kategori" ? (
            <div className="post-step space-y-4">
              {!editing ? <EntitlementStatus /> : null}
              <CategoryPicker
                key={pickerKey}
                value={categoryId}
                chosen={categoryOk}
                startId={categoryOk ? undefined : startRoot}
                onPick={pickCategory}
              />
              {isPetsCategoryId(categoryId) && categoryOk ? (
                <p className="rounded-xl border border-lime/25 bg-lime/10 px-3 py-2 text-xs leading-relaxed text-ink">
                  {t("cat.pets.policy")}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "bilgiler" ? (
            <div className="post-step space-y-4">
              <p className="post-crumb">{pathLabel}</p>
              <div className="post-card">
                <p className="post-card-h">{t("post.dyn")}</p>
                <p className="post-card-sub">{t("post.requiredNote")}</p>
                <DynamicAttributeForm
                  schema={schema}
                  attrs={attrs}
                  onChange={setAttr}
                  approved={approvedVehicles}
                  currency={currency}
                  invalid={missingAttrs}
                />
                {schema.catalogKind ? <VehicleRequestBox segment={schema.catalogKind} brand={attrs.brand} model={attrs.model} /> : null}
              </div>
            </div>
          ) : null}

          {step === "detaylar" ? (
            <div className="post-step space-y-4">
              <p className="post-crumb">{pathLabel}</p>
              <p className="post-card-sub">{t("post.optionalNote")}</p>
              {schema.chassis ? (
                <div className="post-card">
                  <p className="post-card-h">{t("post.chassis")}</p>
                  <ChassisMap value={chassis} onChange={setChassis} />
                </div>
              ) : null}
              {schema.groups.length > 0 ? (
                <div className="post-card">
                  <p className="post-card-h">{t("post.features")}</p>
                  {autoEquipNote ? (
                    <p className="mb-2 rounded-xl border border-line bg-elev px-3 py-2 text-[11px] leading-snug text-ink">
                      {t("post.autoEquip")}
                    </p>
                  ) : null}
                  <FeatureGrid groups={schema.groups} selected={features} onToggle={toggleFeature} />
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Stays mounted on other steps so queued, uploading and failed photos are not lost. */}
          <div className={step === "fotograflar" ? "post-step space-y-4" : "hidden"}>
            <PhotoUploader images={images} onChange={setImages} categoryId={categoryId} onBusyChange={setPhotosBusy} />
          </div>

          {step === "fiyat" ? (
            <div className="post-step space-y-4">
              <div className="post-card space-y-3" data-field="price">
                <Field label={`${t("post.price")} *`}>
                  <div className="post-price">
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="0"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      enterKeyHint="done"
                      autoComplete="off"
                      maxLength={12}
                      aria-invalid={formHint === t("post.needPrice") || undefined}
                    />
                    <span>{currency === "TRY" ? "TL" : listingCurrencySymbol(currency)}</span>
                  </div>
                </Field>
                {parseListingPrice(price) != null ? (
                  <p className="post-price-read">{formatMoney(parseListingPrice(price) ?? 0, currency)}</p>
                ) : null}
                <div>
                  <span className="mb-1.5 block text-sm text-ink">{t("cur.label")}</span>
                  <div className="post-cur" role="radiogroup" aria-label={t("cur.label")}>
                    {LISTING_CURRENCIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={currency === c.id}
                        className={currency === c.id ? "is-on" : ""}
                        onClick={() => {
                          setCurrency(listingCurrencyOf(c.id));
                          setCurrencyChosen(true);
                        }}
                      >
                        {c.symbol} {c.id}
                      </button>
                    ))}
                  </div>
                  <span className="mt-1 block text-[11px] text-muted">{t("cur.note")}</span>
                  {isKktc && !currencyChosen && currency === "GBP" ? (
                    <span className="mt-1 block text-[11px] text-muted">{t("cur.kktcHint")}</span>
                  ) : null}
                </div>
              </div>

              <div className="post-card space-y-3">
                <p className="post-card-h">{t("post.locH")}</p>
                <div>
                  <span className="mb-1.5 block text-sm text-ink">{t("loc.country")}</span>
                  <div className="country-switch !grid-cols-2" role="radiogroup" aria-label={t("loc.country")}>
                    {COUNTRIES.map((c) => {
                      const on = country === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          className={on ? "is-on" : ""}
                          onClick={() => {
                            if (on) return;
                            setCountryPick(c.id);
                            setCity(c.id === "KKTC" ? "" : "İstanbul");
                            setDistrict("");
                            setNeighborhood("");
                          }}
                        >
                          {t(c.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div data-field="city">
                  <SearchSelect
                    label={`${isKktc ? t("loc.kktcRegion") : t("post.city")} *`}
                    value={city}
                    options={cityNames}
                    placeholder={t("post.phCity")}
                    menuMode="inline"
                    onChange={(v) => {
                      setCity(v);
                      setDistrict("");
                      setNeighborhood("");
                    }}
                  />
                </div>
                <div data-field="district">
                  <SearchSelect
                    label={`${isKktc ? t("loc.kktcPlace") : t("post.district")} *`}
                    value={district}
                    options={districts}
                    disabled={!city}
                    placeholder={city ? t("post.phDist") : t("post.phDistFirst")}
                    menuMode="inline"
                    onChange={(v) => {
                      setDistrict(v);
                      setNeighborhood("");
                    }}
                  />
                </div>
                {isKktc && type !== "emlak" && mahalleler.length > 0 ? (
                  <SearchSelect
                    label={t("post.neighborhood")}
                    value={neighborhood}
                    options={mahalleler}
                    placeholder={t("post.phHood")}
                    menuMode="inline"
                    onChange={setNeighborhood}
                  />
                ) : null}
                {type === "emlak" ? (
                  <SearchSelect
                    label={t("post.neighborhood")}
                    value={neighborhood}
                    options={mahalleler}
                    disabled={!district}
                    placeholder={district ? t("post.phHood") : t("flt.districtFirst")}
                    menuMode="inline"
                    onChange={setNeighborhood}
                  />
                ) : null}
              </div>

              {kktcFields.length > 0 ? (
                <div className="post-card space-y-3">
                  <p className="post-card-h">{t("kktc.vehicle")}</p>
                  <p className="kktc-declared">{t("kktc.declared")}</p>
                  {kktcFields.map((f) => (
                    <Field key={f.key} label={t(`kktc.f.${f.key}`)}>
                      <select
                        value={attrs[`${KKTC_ATTR}${f.key}`] ?? ""}
                        onChange={(e) => setAttrs((prev) => ({ ...prev, [`${KKTC_ATTR}${f.key}`]: e.target.value }))}
                        className="post-input"
                      >
                        <option value="">{t("kktc.unset")}</option>
                        {f.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "aciklama" ? (
            <div className="post-step space-y-4">
              <div className="post-card space-y-3">
                <div data-field="title">
                  <Field label={`${t("post.title")} *`}>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                      placeholder={listingTitlePlaceholder(categoryId, t("post.phPrefix"), attrs)}
                      maxLength={TITLE_MAX}
                      enterKeyHint="next"
                      className="post-input"
                    />
                  </Field>
                  <p className="post-count">
                    {title.length}/{TITLE_MAX}
                  </p>
                </div>
                <div data-field="description">
                  <Field label={t("post.body")}>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, BODY_MAX))}
                      placeholder={listingBodyPlaceholder(categoryId)}
                      rows={7}
                      maxLength={BODY_MAX}
                      className="post-input post-textarea"
                    />
                  </Field>
                  <p className="post-count">
                    {description.length}/{BODY_MAX}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {step === "onizleme" ? (
            <div className="post-step space-y-4">
              <PostPreview
                images={images}
                title={title || t("post.untitled")}
                priceLabel={formatMoney(parseListingPrice(price) ?? 0, currency)}
                description={description}
                place={`${city} / ${district}${neighborhood ? ` / ${neighborhood}` : ""}`}
                categoryLabel={pathLabel}
                specs={buildSpecs().filter((s) => s.value?.trim())}
                featureGroups={schema.groups}
                features={features}
                canEdit={(s) => stepIds.includes(s)}
                onEdit={(s) => goTo(s)}
              />
              <UrgentOption business={business} value={urgentAllowed && urgent} onChange={setUrgent} />
            </div>
          ) : null}

          <PostActionBar hint={formHint}>
            {stepIndex > 0 ? (
              <button type="button" onClick={back} className="post-bar-back" disabled={publishing}>
                <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
                {t("post.back")}
              </button>
            ) : null}
            {step === "onizleme" ? (
              <button type="button" onClick={() => void publish()} className="btn-primary post-bar-next" disabled={publishing} aria-busy={publishing}>
                {publishing ? <Loader2 className="relative z-10 h-5 w-5 animate-spin" aria-hidden /> : <Send className="relative z-10 h-5 w-5" aria-hidden />}
                <span className="relative z-10">{publishing ? t("post.publishing") : editing ? t("post.save") : t("post.publishFull")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="btn-primary post-bar-next"
                disabled={step === "fotograflar" && photosBusy}
              >
                <span className="relative z-10">
                  {step === "fotograflar" && photosBusy ? t("photo.uploading") : t("post.next")}
                </span>
                <ChevronRight className="relative z-10 h-5 w-5 rtl:rotate-180" aria-hidden />
              </button>
            )}
          </PostActionBar>
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
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

const DRAFT_KEY = "alsatport-listing-draft";
/** Prefix of the KKTC vasıta answers kept in `attrs`, so drafts and category resets cover them too. */
const KKTC_ATTR = "kk_";
const STEP_IDS: StepId[] = ["kategori", "bilgiler", "detaylar", "fotograflar", "fiyat", "aciklama", "onizleme"];
/** Step numbers of the earlier three-step form, for drafts saved before the wizard. */
const LEGACY_STEPS: StepId[] = ["kategori", "bilgiler", "onizleme"];

type ListingDraft = {
  step: StepId;
  reached: number;
  type: string;
  categoryId: string;
  catChosen: boolean;
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
  currency?: ListingCurrency;
  publishId?: string;
};

function readListingDraft(): ListingDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Omit<ListingDraft, "step" | "reached" | "catChosen"> & {
      step: unknown;
      reached?: number;
      catChosen?: boolean;
    };
    if (!parsed || typeof parsed !== "object") return null;
    const step =
      typeof parsed.step === "number"
        ? (LEGACY_STEPS[parsed.step] ?? "kategori")
        : STEP_IDS.includes(parsed.step as StepId)
          ? (parsed.step as StepId)
          : "kategori";
    return {
      ...parsed,
      step,
      reached: typeof parsed.reached === "number" ? parsed.reached : STEP_IDS.indexOf(step),
      catChosen: parsed.catChosen ?? typeof parsed.step === "number",
      publishId: typeof parsed.publishId === "string" && /^[0-9a-f-]{36}$/i.test(parsed.publishId) ? parsed.publishId : undefined,
    };
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
  return categoryTrail(cat)
    .map((node) => catName(t, node.id, node.name))
    .join(" › ");
}
