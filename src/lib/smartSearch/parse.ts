import {
  categories,
  findCategory,
  hrefForCategoryListings,
  parentOf,
  walkCategories,
  type Category,
} from "@/data/categories";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";
import {
  commonFilterFields,
  filterFieldsForCategory,
  resolvedOptions,
  type FilterField,
  type FilterState,
} from "@/lib/categoryFilters";
import { mergeFilterQuery } from "@/lib/filterUrl";
import { foldText, termOf } from "@/lib/smartSearch/normalize";
import { SMART_HINTS, type SmartChip, type SmartHint } from "@/lib/smartSearch/hints";

export { SMART_HINTS, type SmartChip, type SmartHint };

export type SmartParse = {
  category: Category | null;
  state: FilterState;
  /** Free-text fallback used only when nothing structured was recognised. */
  keyword: string;
};

/**
 * Everyday words → existing category ids. Only ids; the category tree, its fields and options stay the
 * single source of truth. Weight 1 nudges toward a branch, 2 is a direct hit.
 */
const VOCAB: [string[], string, number][] = [
  [["araba", "arabalar", "otomobil", "binek arac", "oto"], "vasita-otomobil", 2],
  [["arac", "araclar", "vasita"], "vasita", 1],
  [["suv", "jip", "jeep", "pickup", "pick up", "arazi araci"], "vasita-suv", 2],
  [["motor", "motorsiklet", "motosiklet", "scooter"], "vasita-moto", 2],
  [["kamyonet", "kamyon", "tir", "cekici"], "vasita-ticari", 2],
  [["minibus", "panelvan", "minivan"], "vasita-van", 2],
  [["tekne", "yat", "bot"], "vasita-deniz", 2],
  [["ev", "evi", "evler", "konut", "konutlar"], "emlak-konut", 2],
  [["daire", "daireler", "apartman dairesi"], "emlak-konut", 1],
  [["kiralik ev", "kiralik daire", "kiralik konut"], "emlak-konut-kiralik", 3],
  [["satilik ev", "satilik daire", "satilik konut"], "emlak-konut-satilik", 3],
  [["gunluk kiralik", "gunluk ev", "tatil evi"], "emlak-konut-gunluk", 3],
  [["dukkan", "magaza kiralik", "isyeri", "is yeri"], "emlak-isyeri", 2],
  [["arsa", "arazi", "tarla"], "emlak-arsa", 2],
  [["usta", "ustasi", "ustalar", "tamirci", "tamircisi", "hizmet", "hizmeti", "servis"], "services", 1],
  [["evden eve", "nakliyat", "nakliye", "nakliyeci"], "services-move-home", 3],
  [["boyaci", "badana", "boya ustasi"], "services-reno-paint", 3],
  [["elektrikci"], "services-reno-elec", 3],
  [["tesisatci", "su tesisatcisi", "su tesisati"], "services-reno-plumb", 3],
  [["fayansci", "fayans ustasi", "seramikci"], "services-reno-surface-tile", 3],
  [["parkeci", "parke ustasi"], "services-reno-floor", 3],
  [["temizlikci", "ev temizligi", "temizlik sirketi"], "services-reno-clean", 2],
  [["is", "is ilani", "is ilanlari", "eleman", "personel", "is ariyorum", "calisan"], "jobs", 1],
  [["ozel ders", "ders", "ogretmen", "hoca", "egitmen"], "tutors", 2],
  [["bakici", "bebek bakicisi", "cocuk bakicisi"], "helpers-child", 2],
  [["hasta bakici", "yasli bakici"], "helpers-elder", 3],
  [["telefon", "cep telefonu", "akilli telefon"], "shopping-phone-handset", 2],
  [["bilgisayar", "pc"], "shopping-computer", 2],
  [["laptop", "notebook", "dizustu"], "shopping-computer-laptop", 3],
  [["buzdolabi", "camasir makinesi", "bulasik makinesi", "beyaz esya"], "shopping-appliance-white", 3],
  [["mobilya", "koltuk takimi", "yatak odasi"], "shopping-decor-mobilya", 2],
  [["playstation", "ps5", "ps4", "xbox", "konsol"], "shopping-gamer-console", 3],
  [["urun", "esya", "ikinci el"], "shopping", 1],
  [["hayvan", "hayvanlar"], "pets", 1],
  [["inek", "dana", "buzagi", "duve", "tosun", "boga", "buyukbas"], "pets-farm-cattle", 3],
  [["koyun", "kuzu", "keci", "oglak", "kucukbas"], "pets-farm-sheep", 3],
  [["tavuk", "civciv", "hindi", "kaz", "ordek"], "pets-farm-poultry", 3],
  [["traktor"], "machines-farm-tractor", 3],
  [["is makinesi", "is makinasi", "kepce"], "machines-work", 2],
];

/** Category names that only qualify another word ("Kiralık", "Diğer"). */
const MODIFIER_NAMES = new Set(["satilik", "kiralik", "diger", "sifir", "ikinci el", "aksesuar", "kedi", "kopek", "kus", "balik"]);

/** Option values too generic to read as intent without a field name next to them. */
const GENERIC_OPTIONS = new Set([
  "var", "yok", "evet", "hayir", "diger", "hepsi", "fark etmez", "farketmez", "aranmiyor", "belirtilmemis", "bilinmiyor",
  "bos", "zemin", "giris", "bahce", "bodrum", "cati", "kadin", "erkek", "karisik", "disi",
]);
/** Fields whose options are mostly numbers or layout words; they are never filled from free text. */
const SKIP_FIELDS = new Set(["floor", "floorCount", "bath", "balcony", "equip", "shopOpts", "keyword", "urgent", "posted", "elevator"]);
/** Strong per-category options that also pick the category (e.g. "iPhone" → phones, "Buzağı" → cattle). */
const INDEX_FIELDS = new Set(["brand", "species", "breed", "subject"]);
/** When an indexed option exists in several branches, the first listed branch wins. */
const INDEX_PRIORITY = [
  "vasita-otomobil",
  "vasita-suv",
  "vasita-moto",
  "shopping-phone-handset",
  "shopping-computer-laptop",
  "pets-farm-cattle",
  "pets-farm-sheep",
  "tutors-lang",
];
const CITY_ALIASES: Record<string, string> = {
  afyon: "Afyonkarahisar",
  antep: "Gaziantep",
  maras: "Kahramanmaraş",
  urfa: "Şanlıurfa",
  izmit: "Kocaeli",
  adapazari: "Sakarya",
  ist: "İstanbul",
};
const STRONG_CHAT = [
  /\b(merhaba|selam|selamlar|naber|nasilsin|kimsin|tesekkur|tesekkurler)\b/,
  /\b(siir|hikaye|fikra|masal|sarki sozu|makale|kompozisyon|odev)\b/,
  /\b(hava durumu|hava nasil|saat kac|bugun gunlerden|doviz kuru|dolar kac|euro kac)\b/,
  /\b(cevir|translate|ozetle|hesapla|tarif|yemek tarifi|kod yaz|python|javascript|sohbet|chat|gpt|chatgpt)\b/,
  /\b(yazar misin|anlatir misin|soyler misin|bilir misin|sence|fikrin|ne yesem|ne izlesem|ne yapsam|ne yapayim|canim sikiliyor)\b/,
];
const WEAK_CHAT = [/\b(nedir|neden|nicin|nasil|kim|hangisi|ne zaman)\b/, /\?/];

type Hit = { start: number; end: number };

class Text {
  s: string;
  constructor(folded: string) {
    this.s = ` ${folded} `;
  }
  /** Finds `term` at a word start, allowing a short Turkish suffix on longer terms. */
  find(term: string, suffix = term.length >= 4 ? 5 : 0): Hit | null {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<= )${esc}${suffix ? `[a-z]{0,${suffix}}` : ""}(?= )`);
    const m = re.exec(this.s);
    return m ? { start: m.index, end: m.index + m[0].length } : null;
  }
  mask(hit: Hit) {
    this.s = this.s.slice(0, hit.start) + " ".repeat(hit.end - hit.start) + this.s.slice(hit.end);
  }
  take(term: string, suffix?: number) {
    const hit = this.find(term, suffix);
    if (hit) this.mask(hit);
    return hit;
  }
}

type TermRef = { id: string; weight: number };
type OptionRef = { id: string; key: string; value: string };

let catIndex: Map<string, TermRef[]> | null = null;
let optIndex: Map<string, OptionRef[]> | null = null;
let nodes: Category[] = [];

function addTerm(map: Map<string, TermRef[]>, term: string | null, ref: TermRef) {
  if (!term) return;
  const list = map.get(term) ?? [];
  const same = list.find((r) => r.id === ref.id);
  if (same) same.weight = Math.max(same.weight, ref.weight);
  else list.push(ref);
  map.set(term, list);
}

function optionTerms(value: string) {
  const out = new Set<string>();
  const full = termOf(value);
  if (full) out.add(full);
  for (const part of value.split(/[()/]/)) {
    const t = termOf(part);
    if (t) out.add(t);
  }
  return [...out].filter((t) => !GENERIC_OPTIONS.has(t) && !/^[\d. ]+$/.test(t));
}

function buildIndexes() {
  if (catIndex && optIndex) return;
  const cats = new Map<string, TermRef[]>();
  const opts = new Map<string, OptionRef[]>();
  nodes = [];
  walkCategories(categories, (c, depth) => {
    if (c.filter) return;
    nodes.push(c);
    const full = termOf(c.name);
    const named = depth >= 2 && full && !full.includes(" ") ? 1 : 2;
    addTerm(cats, full, { id: c.id, weight: full && MODIFIER_NAMES.has(full) ? 0.5 : named });
    for (const part of c.name.split(/&|,|\/|\(|\)|\bve\b/)) {
      const t = termOf(part);
      if (t && t !== full) addTerm(cats, t, { id: c.id, weight: MODIFIER_NAMES.has(t) ? 0.5 : 1.5 });
    }
    for (const alias of c.aliases ?? []) {
      if (/^[a-z]+$/.test(alias) || alias.includes(c.parentId ?? "§")) continue;
      addTerm(cats, termOf(alias.replace(/-/g, " ")), { id: c.id, weight: 1 });
    }
    for (const field of filterFieldsForCategory(c)) {
      if (!INDEX_FIELDS.has(field.key) || !field.options) continue;
      for (const value of field.options) {
        for (const t of optionTerms(value)) {
          const list = opts.get(t) ?? [];
          if (!list.some((r) => r.id === c.id)) list.push({ id: c.id, key: field.key, value });
          opts.set(t, list);
        }
      }
    }
  });
  for (const [words, id, weight] of VOCAB) {
    if (!findCategory(id)) continue;
    for (const w of words) addTerm(cats, termOf(w, 2), { id, weight });
  }
  catIndex = cats;
  optIndex = opts;
}

function isAncestor(a: Category, b: Category) {
  let walk = parentOf(b);
  for (let i = 0; walk && i < 10; i++) {
    if (walk.id === a.id) return true;
    walk = parentOf(walk);
  }
  return false;
}

function pathOf(cat: Category) {
  const out: Category[] = [];
  let walk: Category | undefined = cat;
  for (let i = 0; walk && i < 10; i++) {
    out.unshift(walk);
    walk = parentOf(walk);
  }
  return out;
}

function commonAncestor(list: Category[]) {
  const paths = list.map(pathOf);
  let shared: Category | null = null;
  for (let i = 0; ; i++) {
    const id = paths[0]?.[i]?.id;
    if (!id || !paths.every((p) => p[i]?.id === id)) break;
    shared = paths[0][i];
  }
  return shared;
}

function pickPreferred(ids: string[]) {
  const cats = ids.map((id) => findCategory(id)).filter((c): c is Category => !!c);
  const leaves = cats.filter((c) => !cats.some((o) => o.id !== c.id && isAncestor(c, o)));
  for (const pref of INDEX_PRIORITY) {
    const hit = leaves.find((c) => c.id === pref);
    if (hit) return hit;
  }
  return leaves[0];
}

type Range = { min?: number; max?: number };
type Facts = { price?: Range; year?: Range; km?: Range; sqm?: Range };

function money(num: string, unit?: string) {
  if (unit === "milyon" || unit === "m") return Math.round(Number(num) * 1_000_000);
  if (unit === "bin" || unit === "k") return Math.round(Number(num) * 1_000);
  return Number(/^\d{1,3}(\.\d{3})+$/.test(num) ? num.replace(/\./g, "") : num);
}

const MAX_WORDS = "(?:a|e|ya|ye)? ?kadar|alti|altinda|en fazla|maksimum|max|butceli|butcem|butce";
const MIN_WORDS = "ustu|uzeri|ve ustu|ve uzeri|den fazla|dan fazla|ten fazla|tan fazla|en az|minimum|min";

function extractFacts(text: Text): Facts {
  const facts: Facts = {};
  const year = "(19[5-9]\\d|20[0-4]\\d)";
  const yearRules: [RegExp, (m: RegExpExecArray) => Range][] = [
    [new RegExp(`(?<= )${year} ?(?:-|ile|ila) ?${year}(?: model)?(?: arasi)?(?= )`), (m) => ({ min: +m[1], max: +m[2] })],
    [new RegExp(`(?<= )${year}(?: model| yil| yili)?(?: ve)? ?(?:sonrasi|sonra|ustu|uzeri|yukarisi|(?:den|dan|ten|tan) sonra|(?:den|dan|ten|tan) yeni)(?= )`), (m) => ({ min: +m[1] })],
    [new RegExp(`(?<= )${year}(?: model| yil| yili)?(?: ve)? ?(?:oncesi|once|alti|asagisi|(?:den|dan|ten|tan) once|(?:den|dan|ten|tan) eski)(?= )`), (m) => ({ max: +m[1] })],
    [new RegExp(`(?<= )${year} model(?= )`), (m) => ({ min: +m[1], max: +m[1] })],
  ];
  for (const [re, make] of yearRules) {
    const m = re.exec(text.s);
    if (!m) continue;
    facts.year = make(m);
    text.mask({ start: m.index, end: m.index + m[0].length });
    break;
  }
  const num = "(\\d+(?:\\.\\d+)*)";
  const km = new RegExp(`(?<= )${num} ?(bin)? ?(?:km|kilometre)(?: ?(${MAX_WORDS}|${MIN_WORDS}))?(?= )`).exec(text.s);
  if (km) {
    const v = money(km[1], km[2]);
    facts.km = km[3] && new RegExp(`^(?:${MIN_WORDS})$`).test(km[3]) ? { min: v } : { max: v };
    text.mask({ start: km.index, end: km.index + km[0].length });
  }
  const sqm = new RegExp(`(?<= )${num} ?(?:m2|metrekare|metre kare|m kare)(?: ?(${MAX_WORDS}|${MIN_WORDS}))?(?= )`).exec(text.s);
  if (sqm) {
    const v = Number(sqm[1].replace(/\./g, ""));
    facts.sqm = sqm[2] && new RegExp(`^(?:${MAX_WORDS})$`).test(sqm[2]) ? { max: v } : { min: v };
    text.mask({ start: sqm.index, end: sqm.index + sqm[0].length });
  }
  const unit = "(milyon|bin|k|m)?";
  const cur = "(?:tl|lira|try)?";
  const between = new RegExp(`(?<= )${num} ?${unit} ?${cur} ?(?:-|ile|ila) ?${num} ?${unit} ?${cur}(?: arasi)?(?= )`).exec(text.s);
  if (between && (between[2] || between[4] || /tl|lira/.test(between[0]))) {
    const lo = money(between[1], between[2] ?? between[4]);
    const hi = money(between[3], between[4]);
    if (lo <= hi) facts.price = { min: lo, max: hi };
    text.mask({ start: between.index, end: between.index + between[0].length });
  } else {
    const pre = new RegExp(`(?<= )(en fazla|en az|max|maksimum|min|minimum) ${num} ?${unit} ?${cur}(?= )`).exec(text.s);
    const post = new RegExp(`(?<= )${num} ?${unit} ?(tl|lira|try)?(?: ?(${MAX_WORDS}|${MIN_WORDS}))?(?= )`);
    if (pre && (pre[3] || /tl|lira/.test(pre[0]) || money(pre[2]) >= 1000)) {
      const v = money(pre[2], pre[3]);
      facts.price = /en az|min/.test(pre[1]) ? { min: v } : { max: v };
      text.mask({ start: pre.index, end: pre.index + pre[0].length });
    } else {
      const re = new RegExp(post.source, "g");
      for (let m = re.exec(text.s), i = 0; m && i < 8; m = re.exec(text.s), i++) {
        const [, n, u, c, mod] = m;
        const v = money(n, u);
        if ((u || c || (mod && v >= 1000)) && v > 0) {
          facts.price = mod && new RegExp(`^(?:${MIN_WORDS})$`).test(mod) ? { min: v } : { max: v };
          text.mask({ start: m.index, end: m.index + m[0].length });
          break;
        }
      }
    }
  }
  return facts;
}

function extractPlace(text: Text): { city?: string; district?: string } {
  let city: string | undefined;
  const byLength = [...TURKEY_CITIES].sort((a, b) => b.name.length - a.name.length);
  for (const c of byLength) {
    const t = foldText(c.name);
    if (text.take(t, t.length >= 4 ? 4 : 0)) {
      city = c.name;
      break;
    }
  }
  if (!city) {
    for (const [alias, name] of Object.entries(CITY_ALIASES)) {
      if (text.take(alias, alias.length >= 4 ? 3 : 0)) {
        city = name;
        break;
      }
    }
  }
  if (city) {
    const ds = districtsOf(city).filter((d) => d !== "Merkez").sort((a, b) => b.length - a.length);
    for (const d of ds) {
      const t = foldText(d);
      if (t.length >= 3 && text.take(t, t.length >= 4 ? 4 : 0)) return { city, district: d };
    }
    return { city };
  }
  const seen = new Map<string, { city: string; district: string }[]>();
  for (const c of TURKEY_CITIES) {
    for (const d of c.districts) {
      const t = foldText(d);
      if (t.length < 5 || d === "Merkez" || catIndex?.has(t) || optIndex?.has(t)) continue;
      seen.set(t, [...(seen.get(t) ?? []), { city: c.name, district: d }]);
    }
  }
  const unique = [...seen.entries()].filter(([, v]) => v.length === 1).sort((a, b) => b[0].length - a[0].length);
  for (const [t, [hit]] of unique) {
    if (text.take(t, 4)) return hit;
  }
  return {};
}

function scoreCategories(text: Text, hint?: SmartHint): Category | null {
  buildIndexes();
  const score = new Map<string, number>();
  const bump = (id: string, w: number) => score.set(id, (score.get(id) ?? 0) + w);
  const probe = new Text("");
  probe.s = text.s;
  const spans: { hit: Hit; ids: string[] }[] = [];
  const terms = [...catIndex!.keys()].sort((a, b) => b.length - a.length);
  for (const t of terms) {
    const short = t.length < 4 || MODIFIER_NAMES.has(t);
    const hit = probe.take(t, short ? 0 : undefined);
    if (!hit) continue;
    const refs = catIndex!.get(t)!;
    if (!optIndex!.has(t)) spans.push({ hit, ids: refs.map((r) => r.id) });
    for (const ref of refs) bump(ref.id, ref.weight);
  }
  const optProbe = new Text("");
  optProbe.s = text.s;
  const optTerms = [...optIndex!.keys()].sort((a, b) => b.length - a.length);
  for (const t of optTerms) {
    if (!optProbe.take(t, t.length >= 4 ? 3 : 0)) continue;
    const best = pickPreferred(optIndex!.get(t)!.map((r) => r.id));
    if (best) bump(best.id, 2);
  }
  if (hint) bump(SMART_HINTS[hint], 1);
  if (!score.size) return null;
  const winner = chooseWinner(score);
  if (winner) {
    const onPath = new Set(pathOf(winner).map((c) => c.id));
    const isBelow = (id: string) => {
      const c = findCategory(id);
      return !!c && isAncestor(winner, c);
    };
    for (const { hit, ids } of spans) if (ids.some((id) => onPath.has(id) || isBelow(id))) text.mask(hit);
  }
  return winner;
}

function chooseWinner(score: Map<string, number>): Category | null {
  let top = 0;
  let winners: Category[] = [];
  for (const c of nodes) {
    const self = score.get(c.id);
    if (!self) continue;
    const total = pathOf(c).reduce((sum, p) => sum + (score.get(p.id) ?? 0), 0);
    const hasStrong = pathOf(c).some((p) => (score.get(p.id) ?? 0) >= 1);
    if (!hasStrong) continue;
    if (total > top + 1e-9) {
      top = total;
      winners = [c];
    } else if (Math.abs(total - top) < 1e-9) {
      winners.push(c);
    }
  }
  if (!winners.length) return null;
  if (winners.length === 1) return winners[0];
  return commonAncestor(winners) ?? winners[0];
}

function fillOptions(text: Text, fields: FilterField[], state: FilterState) {
  type Cand = { term: string; field: FilterField; value: string };
  const collect = (list: FilterField[]) => {
    const out: Cand[] = [];
    for (const field of list) {
      if (field.kind !== "select" || SKIP_FIELDS.has(field.key) || state[field.key]) continue;
      for (const value of resolvedOptions(field, state)) {
        for (const term of optionTerms(value)) out.push({ term, field, value });
      }
    }
    return out.sort((a, b) => b.term.length - a.term.length);
  };
  const filled = new Set<string>();
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const cand of collect(fields.filter((f) => !filled.has(f.key) && (!f.dependsOn || state[f.dependsOn])))) {
      if (filled.has(cand.field.key)) continue;
      if (!text.take(cand.term, cand.term.length >= 4 ? 3 : 0)) continue;
      state[cand.field.key] = cand.value;
      filled.add(cand.field.key);
      changed = true;
    }
    if (!changed) break;
  }
}

function setRange(state: FilterState, fields: FilterField[], minKey: string, maxKey: string, r?: Range) {
  if (!r || !fields.some((f) => f.key === minKey)) return;
  if (r.min != null && Number.isFinite(r.min) && r.min > 0) state[minKey] = String(Math.round(r.min));
  if (r.max != null && Number.isFinite(r.max) && r.max > 0) state[maxKey] = String(Math.round(r.max));
}

export function isChatty(text: string, mapped: boolean) {
  const f = foldText(text);
  if (STRONG_CHAT.some((re) => re.test(f))) return true;
  return !mapped && (WEAK_CHAT.some((re) => re.test(f) || re.test(text)) || f.split(" ").length > 7);
}

export function parseSmartQuery(raw: string, hint?: SmartHint): SmartParse {
  buildIndexes();
  const text = new Text(foldText(raw));
  const facts = extractFacts(text);
  const category = scoreCategories(text, hint);
  const place = extractPlace(text);
  const fields = category ? filterFieldsForCategory(category) : commonFilterFields();
  const state: FilterState = {};
  if (place.city) state.city = place.city;
  if (place.district) state.district = place.district;
  setRange(state, fields, "priceMin", "priceMax", facts.price);
  setRange(state, fields, "yearMin", "yearMax", facts.year);
  setRange(state, fields, "kmMin", "kmMax", facts.km);
  setRange(state, fields, "sqmMin", "sqmMax", facts.sqm);
  if (category) fillOptions(text, fields, state);
  return { category, state: validateSmartState(category, state), keyword: category ? "" : leftoverKeyword(raw, text) };
}

const FILLER = new Set([
  "ve", "ile", "icin", "bir", "en", "cok", "ariyorum", "ariyoruz", "istiyorum", "lazim", "bul", "bulun", "bana", "benim",
  "uygun", "ucuz", "guzel", "iyi", "temiz", "olan", "gibi", "da", "de", "ki", "mi", "mu", "ilan", "ilani", "ilanlari",
  "alinik", "almak", "satin", "al", "ara", "arama", "acil", "yakin", "yakinda", "civari", "civarinda", "tl", "lira",
]);

/** Original-spelling words the structured pass did not consume; used only as a plain keyword search. */
function leftoverKeyword(raw: string, text: Text) {
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length > 5) return "";
  const kept: string[] = [];
  for (const word of words) {
    const clean = word.replace(/[^\p{L}\p{N}+]/gu, "");
    const folded = foldText(clean);
    if (folded.length < 2 || FILLER.has(folded) || !text.find(folded, 0)) continue;
    kept.push(clean);
  }
  return kept.slice(0, 4).join(" ").slice(0, 60);
}

const NUMERIC_BOUNDS: Record<string, [number, number]> = {
  yearMin: [1950, new Date().getFullYear() + 1],
  yearMax: [1950, new Date().getFullYear() + 1],
};

/**
 * Allowlist gate for any candidate filter state (rule parser or AI): only the category's own field keys,
 * option values that exist in that field, real cities/districts and bounded integers survive.
 */
export function validateSmartState(category: Category | null, candidate: Record<string, unknown>): FilterState {
  const fields = category ? filterFieldsForCategory(category) : commonFilterFields();
  const byKey = new Map<string, FilterField>();
  for (const f of fields) {
    byKey.set(f.key, f);
    if (f.pairKey && !byKey.has(f.pairKey)) byKey.set(f.pairKey, { ...f, key: f.pairKey, pairKey: f.key });
  }
  const out: FilterState = {};
  const get = (key: string) =>
    Object.prototype.hasOwnProperty.call(candidate, key) && typeof candidate[key] === "string" ? (candidate[key] as string) : "";
  const city = get("city");
  if (city && TURKEY_CITIES.some((c) => c.name === city) && byKey.has("city")) {
    out.city = city;
    const district = get("district");
    if (district && districtsOf(city).includes(district) && byKey.has("district")) out.district = district;
  }
  for (const [key, field] of byKey) {
    if (key === "city" || key === "district" || key === "neighborhood") continue;
    const value = get(key);
    if (!value) continue;
    if (field.kind === "range") {
      if (!/^\d{1,12}$/.test(value)) continue;
      const bounds = NUMERIC_BOUNDS[key];
      if (bounds && (+value < bounds[0] || +value > bounds[1])) continue;
      out[key] = value;
      continue;
    }
    if (field.kind === "select") {
      const options = resolvedOptions(field, out);
      if (options.includes(value)) out[key] = value;
    }
  }
  for (const [lo, hi] of [["priceMin", "priceMax"], ["yearMin", "yearMax"], ["kmMin", "kmMax"], ["sqmMin", "sqmMax"]]) {
    if (out[lo] && out[hi] && +out[lo] > +out[hi]) delete out[lo];
  }
  return out;
}

/** Relative results URL on the existing listing pages; built only from validated values. */
export function smartResultsHref(category: Category | null, state: FilterState, keyword = "") {
  const base = category ? hrefForCategoryListings(category) : "/ara";
  const [path, existing = ""] = base.split("?");
  const current = new URLSearchParams(existing);
  if (keyword) current.set("q", keyword);
  const qs = mergeFilterQuery(current, state);
  const href = qs ? `${path}?${qs}` : path;
  return href.startsWith("/") && !href.startsWith("//") ? href : "/ara";
}

const RANGE_CHIPS: [string, string, string, SmartChip["unit"]?][] = [
  ["priceMin", "priceMax", "ai.lbl.price", "try"],
  ["yearMin", "yearMax", "post.year"],
  ["kmMin", "kmMax", "post.km", "km"],
  ["sqmMin", "sqmMax", "ai.lbl.sqm", "sqm"],
];

export function smartChips(category: Category | null, state: FilterState, keyword = ""): SmartChip[] {
  const chips: SmartChip[] = [];
  if (category) chips.push({ labelKey: "ai.lbl.cat", value: category.id });
  if (state.city) chips.push({ labelKey: "ai.lbl.city", value: state.city });
  if (state.district) chips.push({ labelKey: "ai.lbl.district", value: state.district });
  const fields = category ? filterFieldsForCategory(category) : commonFilterFields();
  const done = new Set(["city", "district"]);
  for (const [lo, hi, labelKey, unit] of RANGE_CHIPS) {
    done.add(lo).add(hi);
    if (state[lo] || state[hi]) chips.push({ labelKey, min: state[lo], max: state[hi], unit });
  }
  for (const f of fields) {
    if (done.has(f.key) || !state[f.key]) continue;
    done.add(f.key);
    chips.push({ labelKey: f.labelKey, value: state[f.key] });
  }
  if (keyword) chips.push({ labelKey: "ai.lbl.keyword", value: keyword });
  return chips;
}
