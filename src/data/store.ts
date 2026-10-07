import type { ChassisStatus } from "./listingSchema";
import { buildDemoListings } from "./demoSeed";
import { buildDemoCars } from "./demoCars";

export type Listing = {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  priceLabel?: string;
  categoryId: string;
  city: string;
  district: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  images: string[];
  description: string;
  sellerId: string;
  sellerName: string;
  /** Set only when the seller is an admin-verified business; otherwise sellerName is a masked person name. */
  sellerBusiness?: boolean;
  sellerAvatar: string;
  sellerVerified: boolean;
  createdAt: string;
  views: number;
  featured: boolean;
  vip: boolean;
  status: "active" | "passive" | "pending" | "rejected" | "expired" | "sold";
  specs: { label: string; value: string }[];
  features?: string[];
  chassis?: Record<string, ChassisStatus>;
  listingNo: string;
  postedAt?: number;
  expiresAt?: number;
  soldAt?: number;
  urgent?: boolean;
  refurbished?: boolean;
  sellerPhone?: string;
  sellerSince?: string;
  /** Present only while the seller's corporate store is admin-approved. */
  store?: { slug: string; name: string; logo?: string };
};

export type UserProfile = {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  verified: boolean;
  memberSince: string;
  joinedAt?: number;
  listings: number;
  sales: number;
  stars: number;
  followers: number;
  following: number;
  city: string;
  plan: "standart" | "profesyonel" | "vip";
  freeListingQuota?: number;
  listingsPosted?: number;
  planListingAllowance?: number;
  dopingUntil?: number;
  planUntil?: number;
  openAccessUntil?: number;
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  profileComplete?: boolean;
  authProvider?: "email" | "google" | "apple" | "facebook";
  role?: "member" | "seller" | "admin";
  businessName?: string;
  businessVerified?: boolean;
  hasPassword?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: "email" | "sms";
  /** Masked (e***@x.com); the full address never leaves the server. */
  recoveryEmailMasked?: string;
  recoveryEmailVerified?: boolean;
  readReceipts?: boolean;
  marketingEmail?: boolean;
  marketingSms?: boolean;
  marketingPush?: boolean;
};

export type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  peerName: string;
  peerAvatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  favorite: boolean;
  peerVerified?: boolean;
  blockedByMe?: boolean;
  blockedMe?: boolean;
  /** Only set when both sides allow read receipts. */
  peerReadAt?: number;
  messages: { id: string; fromMe: boolean; text: string; time: string; at?: number }[];
};

export function getSellerPhone(sellerId: string, listing?: Pick<Listing, "sellerPhone">) {
  if (listing?.sellerPhone) return listing.sellerPhone;
  if (process.env.NODE_ENV === "production") return "";
  const phones: Record<string, string> = {
    "u-ekrem": "+90 532 111 22 33",
    "u-selim": "+90 555 444 33 22",
    "u-ayse": "+90 544 321 98 76",
    "u-burak": "+90 536 210 45 67",
    "u-ahmet": "+90 541 678 90 12",
    "u-merve": "+90 533 246 80 13",
    "u-fatma": "+90 505 987 65 43",
    "u-demo-1": "+90 530 111 22 44",
    "u-demo-2": "+90 542 333 44 55",
  };
  return phones[sellerId] ?? "";
}

export function maskPhone(phone: string) {
  if (phone.length < 10 || phone.includes("*")) return phone;
  return `${phone.slice(0, 7)} *** ** ${phone.slice(-2)}`;
}

export const currentUser: UserProfile = {
  id: "u-ekrem",
  username: "ekrem1987",
  displayName: "ekrem1987",
  avatar:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  verified: true,
  memberSince: "24 Eylül 2016",
  listings: 12,
  sales: 5,
  stars: 7,
  followers: 8,
  following: 15,
  city: "İstanbul",
  plan: "standart",
  freeListingQuota: 3,
  listingsPosted: 12,
  planListingAllowance: 0,
  email: "ekrem1987@alsatport.com",
  fullName: "Ekrem Yılmaz",
  phone: "05321112233",
  address: "",
  emailVerified: true,
  profileComplete: true,
  authProvider: "email",
};

const coreListings: Listing[] = [
  {
    id: "l1",
    title: "iPhone 15 Pro Max",
    subtitle: "128 GB · Mavi Titan",
    price: 42500,
    categoryId: "phones",
    city: "Ankara",
    district: "Çankaya",
    images: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Cihazım sıfırdır, kutulu ve tüm aksesuarları mevcuttur. Herhangi bir çizik yoktur. Fatura ve garantili.",
    sellerId: "u-ekrem",
    sellerName: "ekrem1987",
    sellerAvatar: currentUser.avatar,
    sellerVerified: true,
    createdAt: "2 saat önce",
    views: 182,
    featured: true,
    vip: false,
    status: "active",
    specs: [
      { label: "Hafıza", value: "128 GB" },
      { label: "Renk", value: "Mavi Titan" },
      { label: "Durum", value: "Sıfır" },
    ],
    listingNo: "12345678",
    postedAt: Date.now() - 2 * 3_600_000,
    urgent: true,
  },
  {
    id: "l2",
    title: "BMW 320i M Sport",
    subtitle: "2018 · 120.000 km",
    price: 1250000,
    categoryId: "auto",
    city: "İstanbul",
    district: "Kadıköy",
    images: [
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1400&q=80",
    ],
    description:
      "Aracın 2018 model BMW 320i M Sport paketidir. Tüm bakımları zamanında yapılmıştır. Yüksek kilometre yoktur. Masrafsızdır. Ciddi alıcılar acele etsin. 2.345 ilan.",
    sellerId: "u-selim",
    sellerName: "Selim Demir",
    sellerAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    sellerVerified: true,
    createdAt: "28 Eylül 2025",
    views: 940,
    featured: true,
    vip: false,
    status: "active",
    specs: [
      { label: "Marka", value: "BMW" },
      { label: "Model", value: "3 Serisi" },
      { label: "Paket", value: "320i" },
      { label: "Motor", value: "2.0" },
      { label: "Yıl", value: "2018" },
      { label: "Km", value: "120.000 km" },
      { label: "Yakıt", value: "Benzin" },
      { label: "Vites", value: "Otomatik" },
      { label: "Kasa", value: "Sedan" },
      { label: "Motor gücü", value: "184 hp" },
      { label: "Çekiş", value: "Arkadan itiş" },
      { label: "Renk", value: "Beyaz" },
      { label: "Hasar kaydı", value: "Yok" },
      { label: "Boyalı parça", value: "1" },
      { label: "Değişen parça", value: "0" },
      { label: "Lokal boya", value: "1" },
    ],
    features: [
      "ABS",
      "ESP",
      "ASR",
      "Hava Yastığı (Sürücü)",
      "Hava Yastığı (Yolcu)",
      "Hava Yastığı (Yan)",
      "Isofix",
      "Hız Sabitleyici",
      "Geri Görüş Kamerası",
      "Arka Radar",
      "Merkezi Kilit",
      "Immobilizer",
      "Deri Koltuk",
      "Elektrikli Koltuk",
      "Isıtmalı Koltuk",
      "Otomatik Klima",
      "Start-Stop",
      "Yağmur Sensörü",
      "Far Sensörü",
      "LED Far",
      "LED Stop",
      "Alaşım Jant",
      "Park Sensörü (Arka)",
      "Elektrikli Ayna",
      "Dokunmatik Ekran",
      "Navigasyon",
      "Bluetooth",
      "USB",
      "Apple CarPlay",
      "Android Auto",
    ],
    chassis: {
      frontBumper: "original",
      hood: "painted",
      roof: "original",
      trunk: "original",
      rearBumper: "original",
      lfFender: "original",
      lfDoor: "original",
      lrDoor: "local",
      lrQuarter: "original",
      rfFender: "original",
      rfDoor: "original",
      rrDoor: "original",
      rrQuarter: "original",
    },
    listingNo: "12345678",
  },
  {
    id: "l3",
    title: "Kiralık Daire",
    subtitle: "2+1 · Ankara / Mamak",
    price: 18000,
    categoryId: "estate",
    city: "Ankara",
    district: "Mamak",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80",
    ],
    description: "Merkezi konumda, yeni binada 2+1 kiralık daire. Site içerisinde, otoparklı.",
    sellerId: "u-ayse",
    sellerName: "Zeynep Arslan",
    sellerAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    sellerVerified: true,
    createdAt: "1 gün önce",
    views: 310,
    featured: true,
    vip: false,
    status: "active",
    specs: [
      { label: "İlan tipi", value: "Kiralık" },
      { label: "Emlak tipi", value: "Daire" },
      { label: "m²", value: "95" },
      { label: "Net m²", value: "82" },
      { label: "Oda", value: "2+1" },
      { label: "Bina yaşı", value: "1-5" },
      { label: "Kat", value: "4" },
      { label: "Isıtma", value: "Kombi" },
      { label: "Banyo", value: "1" },
      { label: "Balkon", value: "Var" },
      { label: "Asansör", value: "Var" },
      { label: "Otopark", value: "Kapalı Otopark" },
      { label: "Eşya", value: "Eşyasız" },
      { label: "Cephe", value: "Güney" },
      { label: "Krediye uygun", value: "Hayır" },
    ],
    features: [
      "ADSL",
      "Fiber İnternet",
      "Asansör",
      "Balkon",
      "Ankastre Mutfak",
      "Duşakabin",
      "Isıcam",
      "Spot Aydınlatma",
      "PVC Doğrama",
      "Site İçerisinde",
      "Güvenlik",
      "Kapalı Otopark",
      "Çocuk Parkı",
      "Jeneratör",
      "Isı Yalıtımı",
      "Market",
      "Park",
      "Eczane",
      "Metro",
      "Otobüs Durağı",
      "Şehir",
      "Ara Kat",
      "Asansörlü",
    ],
    listingNo: "22334455",
  },
  {
    id: "l4",
    title: "MacBook Air M2",
    subtitle: "256 GB · 8 GB RAM",
    price: 28000,
    categoryId: "computer",
    city: "İzmir",
    district: "Bornova",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1400&q=80",
    ],
    description: "2022 MacBook Air M2, az kullanılmış, batarya sağlığı %97.",
    sellerId: "u-ekrem",
    sellerName: "ekrem1987",
    sellerAvatar: currentUser.avatar,
    sellerVerified: true,
    createdAt: "18 görüntülenme · 1 mesaj",
    views: 18,
    featured: true,
    vip: false,
    status: "active",
    specs: [
      { label: "Marka", value: "Apple" },
      { label: "Durum", value: "Az Kullanılmış" },
      { label: "Hafıza", value: "256 GB" },
      { label: "Chip", value: "M2" },
      { label: "RAM", value: "8 GB" },
    ],
    listingNo: "33445566",
  },
  {
    id: "l5",
    title: "Honda CB 250R",
    subtitle: "2022 · Temiz",
    price: 145000,
    categoryId: "sport",
    city: "Bursa",
    district: "Nilüfer",
    images: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1400&q=80",
    ],
    description: "2022 model Honda CB 250R, bakımlı ve tertemiz.",
    sellerId: "u-burak",
    sellerName: "Burak Çelik",
    sellerAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    sellerVerified: false,
    createdAt: "3 gün önce",
    views: 88,
    featured: true,
    vip: false,
    status: "active",
    specs: [
      { label: "Yıl", value: "2022" },
      { label: "Km", value: "4.200" },
    ],
    listingNo: "44556677",
  },
  {
    id: "l7",
    title: "iPhone 15",
    subtitle: "128 GB",
    price: 34000,
    categoryId: "phones",
    city: "İstanbul",
    district: "Beşiktaş",
    images: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80",
    ],
    description: "iPhone 15 128 GB, mavi, kutulu.",
    sellerId: "u-merve",
    sellerName: "Merve Kaya",
    sellerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    sellerVerified: true,
    createdAt: "4 saat önce",
    views: 41,
    featured: false,
    vip: false,
    status: "active",
    specs: [{ label: "Hafıza", value: "128 GB" }],
    listingNo: "55667788",
  },
  {
    id: "l8",
    title: "iPhone 15 Plus",
    subtitle: "256 GB",
    price: 37500,
    categoryId: "phones",
    city: "İzmir",
    district: "Konak",
    images: [
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1200&q=80",
    ],
    description: "iPhone 15 Plus 256 GB pembe, çok az kullanılmış.",
    sellerId: "u-fatma",
    sellerName: "Fatma Yıldız",
    sellerAvatar:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=200&q=80",
    sellerVerified: true,
    createdAt: "5 saat önce",
    views: 22,
    featured: false,
    vip: false,
    status: "active",
    specs: [{ label: "Hafıza", value: "256 GB" }],
    listingNo: "66778899",
    refurbished: true,
    postedAt: Date.now() - 20 * 3_600_000,
  },
  {
    id: "l9",
    title: "iPhone 15",
    subtitle: "128 GB",
    price: 32500,
    categoryId: "phones",
    city: "Bursa",
    district: "Osmangazi",
    images: [
      "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=1200&q=80",
    ],
    description: "iPhone 15 sarı, 128 GB, garantili.",
    sellerId: "u-ekrem",
    sellerName: "ekrem1987",
    sellerAvatar: currentUser.avatar,
    sellerVerified: true,
    createdAt: "6 saat önce",
    views: 19,
    featured: false,
    vip: true,
    status: "active",
    specs: [{ label: "Hafıza", value: "128 GB" }],
    listingNo: "77889900",
  },
];

export const listings: Listing[] =
  process.env.NODE_ENV === "production" ? [] : [...coreListings, ...buildDemoCars(), ...buildDemoListings()];

export const conversations: Conversation[] = [
  {
    id: "c1",
    listingId: "l1",
    listingTitle: "iPhone 15 Pro Max",
    listingImage:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80",
    peerName: "Ahmet Yılmaz",
    peerAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
    lastMessage: "Merhaba, hala satışta mı?",
    time: "10:24",
    unread: 2,
    favorite: false,
    messages: [
      { id: "m1", fromMe: false, text: "Merhaba, hala satışta mı?", time: "10:24" },
      { id: "m2", fromMe: false, text: "Fiyatta biraz esneklik olur mu?", time: "10:25" },
    ],
  },
  {
    id: "c2",
    listingId: "l2",
    listingTitle: "BMW 320i M Sport",
    listingImage: coreListings[1].images[0],
    peerName: "Merve Kaya",
    peerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    lastMessage: "Ürün hakkında bilgi alabilir miyim?",
    time: "09:17",
    unread: 1,
    favorite: false,
    messages: [
      { id: "m1", fromMe: false, text: "Ürün hakkında bilgi alabilir miyim?", time: "09:17" },
    ],
  },
  {
    id: "c3",
    listingId: "l4",
    listingTitle: "MacBook Air M2",
    listingImage: coreListings[3].images[0],
    peerName: "Selim Demir",
    peerAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    lastMessage: "Fiyatı son ne kadar düşürebilirsiniz?",
    time: "Dün",
    unread: 0,
    favorite: true,
    messages: [
      { id: "m1", fromMe: true, text: "Merhaba, ilanınızı gördüm.", time: "18:01" },
      { id: "m2", fromMe: false, text: "Fiyatı son ne kadar düşürebilirsiniz?", time: "18:22" },
    ],
  },
  {
    id: "c4",
    listingId: "l3",
    listingTitle: "Kiralık Daire",
    listingImage: coreListings[2].images[0],
    peerName: "Zeynep Arslan",
    peerAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    lastMessage: "Teşekkürler, hayırlı olsun.",
    time: "Dün",
    unread: 0,
    favorite: false,
    messages: [
      { id: "m1", fromMe: false, text: "Teşekkürler, hayırlı olsun.", time: "20:10" },
    ],
  },
  {
    id: "c5",
    listingId: "l5",
    listingTitle: "Honda CB 250R",
    listingImage: coreListings[4].images[0],
    peerName: "Burak Çelik",
    peerAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    lastMessage: "Ne zaman teslim alabilirim acaba?",
    time: "Pzt",
    unread: 0,
    favorite: false,
    messages: [
      { id: "m1", fromMe: false, text: "Ne zaman teslim alabilirim acaba?", time: "11:00" },
    ],
  },
  {
    id: "c6",
    listingId: "l8",
    listingTitle: "iPhone 15 Plus",
    listingImage: coreListings[7].images[0],
    peerName: "Fatma Yıldız",
    peerAvatar:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=200&q=80",
    lastMessage: "Satın almak istiyorum.",
    time: "Pzt",
    unread: 0,
    favorite: true,
    messages: [
      { id: "m1", fromMe: false, text: "Satın almak istiyorum.", time: "14:40" },
    ],
  },
];

export const packages = [
  {
    id: "standart" as const,
    name: "Standart",
    price: 0,
    listPrice: 0,
    period: "3 ücretsiz ilan · 7 gün",
    icon: "crown-outline",
    discount: 0,
    features: ["3 ücretsiz ilan hakkı", "7 gün yayında kalma", "Standart sıralama"],
  },
  {
    id: "profesyonel" as const,
    name: "Premium",
    altName: "Profesyonel",
    price: 299,
    listPrice: 598,
    period: "15 Gün",
    icon: "star",
    discount: 50,
    features: ["+15 ilan hakkı", "15 gün yayında kalma", "3 kat görünürlük"],
  },
  {
    id: "vip" as const,
    name: "VIP",
    price: 599,
    listPrice: 1198,
    period: "30 Gün",
    icon: "diamond",
    discount: 50,
    features: ["+50 ilan hakkı", "30 gün yayında kalma", "Sabit üst sıralama", "Tüm doping avantajları"],
  },
];

export const addons = [
  {
    id: "doping" as const,
    name: "Doping",
    price: 199,
    listPrice: 398,
    period: "3 Gün",
    discount: 50,
    features: ["Anasayfa vitrin", "3 gün öne çıkarma", "Arama üstü yerleştirme"],
  },
];

export function formatPrice(n: number) {
  return n.toLocaleString("tr-TR") + " TL";
}

export function phoneToTel(phone: string) {
  return "tel:" + phone.replace(/[^\d+]/g, "");
}
