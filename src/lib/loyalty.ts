import { prefStorage } from "@/lib/consent";

export type LoyaltyKind = "month1" | "month6" | "year1" | "yearN";

export type LoyaltyCard = {
  id: string;
  kind: LoyaltyKind;
  years?: number;
  eyebrow: string;
  title: string;
  body: string;
  closing: string;
  cta: string;
};

const DAY = 86_400_000;
const WINDOW_DAYS = 18;

function addMonths(from: Date, months: number) {
  const d = new Date(from.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function addYears(from: Date, years: number) {
  const d = new Date(from.getTime());
  const month = d.getMonth();
  d.setFullYear(d.getFullYear() + years);
  if (d.getMonth() !== month) d.setDate(0);
  return d;
}

function inWindow(now: number, start: Date) {
  const t = start.getTime();
  return now >= t && now < t + WINDOW_DAYS * DAY;
}

const YEAR_N_COPY: Array<(n: number) => Omit<LoyaltyCard, "id" | "kind" | "years">> = [
  (n) => ({
    eyebrow: `${n}. yıl dönümü`,
    title: `Birlikte geçen ${n} koca yıl.`,
    body: `AlSatPort’ta ${n} yılı omuz omuza geride bıraktık. Bu süre bir rakam değil; güvenle açılan ilanlar, dürüst pazarlıklar ve senin buradaki imzan. Kıdemin bize onur veriyor.`,
    closing: "Bu prestijli yolculukta yanındayız — yeni yılın sana daha ferah fırsatlar getirsin.",
    cta: "Yolculuğa devam et",
  }),
  (n) => ({
    eyebrow: `${n}. yılın şerefine`,
    title: `Birlikte geçen ${n} koca yıl, bir vefa.`,
    body: `${n} yıl boyunca AlSatPort’u evin gibi kullandın. Bu sadakat, platformun kalbinde duruyor. Teşekkürümüz sıradan bir kutlama değil; seninle büyüdüğümüzün resmi.`,
    closing: "Kıdemli üyeliğin her yeni yılda tazelenir. Bu yıl da seninle gurur duyuyoruz.",
    cta: "Ayrıcalığını yaşa",
  }),
  (n) => ({
    eyebrow: `${n} yıllık kıdem`,
    title: `Birlikte geçen ${n} koca yılın izi silinmez.`,
    body: `Bazı üyeler gelir geçer; sen kaldın. ${n} yılın her mevsiminde AlSatPort’ta bir iz bıraktın. Bu kart, o emeğin ve güvenin karşılığıdır.`,
    closing: "Ödülümüz sözde değil: seni kıdemli ailemizin merkezinde tutmak.",
    cta: "Keşfetmeye devam",
  }),
  (n) => ({
    eyebrow: `${n}. yıl — altın halka`,
    title: `Birlikte geçen ${n} koca yıl, altın bir halka.`,
    body: `Üyelik zincirine ${n}. halka eklendi. AlSatPort’ta bu kadar yıl durmak, dürüst alım satıma inandığın içindir. Bu inancı paylaşıyoruz.`,
    closing: "Yeni yılın kapısı açık. Prestijin burada saklı; mesajın her yıl yenilenecek.",
    cta: "Yeni yıla merhaba",
  }),
  (n) => ({
    eyebrow: `${n} yıl, aynı adres`,
    title: `Birlikte geçen ${n} koca yıl aynı çatı altında.`,
    body: `AlSatPort senin için bir site olmaktan çıktı; alışkanlık, adres, güvence oldu. ${n} yılın ağırlığını hafifletmek değil, taçlandırmak istiyoruz.`,
    closing: "Kutlaman bize ait olduğu kadar sana da ait. Teşekkürler, kıdemli üyemiz.",
    cta: "Al, sat, keşfet",
  }),
  (n) => ({
    eyebrow: `${n}. yıl dönümü beratı`,
    title: `Birlikte geçen ${n} koca yılın beratı.`,
    body: `Bu ekran bir bildirim değil, bir berat. ${n} yıldır AlSatPort’tasın; her ilanın, her mesajın bu çatıyı sağlamlaştırdı. Kıdemin taze, saygınlığın yerinde.`,
    closing: "Her yeni yıl bu kartı yenileriz. Çünkü senin hikâyen tek seferlik değil.",
    cta: "Beratını kapat",
  }),
];

function yearCard(n: number): LoyaltyCard {
  const copy = YEAR_N_COPY[(n - 2) % YEAR_N_COPY.length]!(n);
  return { id: `year-${n}`, kind: "yearN", years: n, ...copy };
}

export function loyaltyCardForJoinedAt(joinedAt: number, now = Date.now()): LoyaltyCard | null {
  if (!Number.isFinite(joinedAt) || joinedAt <= 0 || now < joinedAt) return null;
  const start = new Date(joinedAt);

  const maxYears = Math.max(0, new Date(now).getFullYear() - start.getFullYear() + 1);
  for (let n = maxYears + 1; n >= 2; n--) {
    if (inWindow(now, addYears(start, n))) return yearCard(n);
  }
  if (inWindow(now, addYears(start, 1))) {
    return {
      id: "year-1",
      kind: "year1",
      years: 1,
      eyebrow: "Kıdemli üye",
      title: "İlk yılın onuru senin.",
      body: "Bugün AlSatPort’ta bir yılı devirdin. Artık kıdemli üyelerimizdensin. Bu onur; güvenilir alışverişin, açık pazarın ve senin burada durduğun her güne ait.",
      closing: "İlk yılın bitti, asıl yolculuk şimdi derinleşiyor. Yanındayız.",
      cta: "Kıdemini taşı",
    };
  }
  if (inWindow(now, addMonths(start, 6))) {
    return {
      id: "month-6",
      kind: "month6",
      eyebrow: "Yarım yıl",
      title: "Altı ay, bir hikâye.",
      body: "AlSatPort’ta yarım yılı geride bıraktın. Güvenin, emeğin ve buradaki varlığın için teşekkür ederiz. Bu gurur yalnızca senin değil; birlikte büyüttüğümüz bir iz.",
      closing: "İlk coşku yerleşti, şimdi kök salıyorsun. İyi ki buradasın.",
      cta: "Teşekkürler, AlSatPort",
    };
  }
  if (inWindow(now, addMonths(start, 1))) {
    return {
      id: "month-1",
      kind: "month1",
      eyebrow: "İlk ayın",
      title: "Hoş geldin — artık buradasın.",
      body: "AlSatPort ailesine katılalı bir ay oldu. Bu ilk otuz günde platformu yokladın, ilanlara göz attın, belki ilk adımını attın. Uyum sürecinin coşkusunu seninle kutluyoruz.",
      closing: "Burası senin pazarın. Al, sat, keşfet — samimiyetle.",
      cta: "Keşfetmeye başla",
    };
  }
  return null;
}

const STORAGE_KEY = "alsatport-loyalty-seen-v1";

function readMap(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = prefStorage.get(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function hasSeenLoyalty(userId: string, cardId: string) {
  const list = readMap()[userId];
  return Array.isArray(list) && list.includes(cardId);
}

export function markLoyaltySeen(userId: string, cardId: string) {
  const map = readMap();
  const prev = Array.isArray(map[userId]) ? map[userId]! : [];
  if (prev.includes(cardId)) return;
  map[userId] = [...prev, cardId].slice(-24);
  try {
    prefStorage.set(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}
