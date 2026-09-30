import { categories } from "@/data/categories";

export const CORPORATE_NAV = [
  { href: "/kurumsal/hakkimizda", slug: "hakkimizda", label: "Hakkımızda" },
  { href: "/kurumsal/dunden-bugune", slug: "dunden-bugune", label: "Dünden Bugüne" },
  { href: "/kurumsal/sayilarla", slug: "sayilarla", label: "Sayılarla AlsatPort" },
  { href: "/kurumsal/surdurulebilirlik", slug: "surdurulebilirlik", label: "Sürdürülebilirlik" },
  { href: "/kurumsal/insan-kaynaklari", slug: "insan-kaynaklari", label: "İnsan Kaynakları" },
  { href: "/kurumsal/haberler", slug: "haberler", label: "Haberler" },
  { href: "/kurumsal/iletisim", slug: "iletisim", label: "İletişim" },
] as const;

export const TIMELINE = [
  {
    year: "2022",
    title: "Fikir ve çekirdek ekip",
    text: "Türkiye’de ikinci el ve yeni ürün alışverişini daha şeffaf, daha hızlı ve daha güvenli kılma hedefiyle AlsatPort fikri doğdu. İlk çekirdek ekip; ilan, kimlik ve mesajlaşma deneyimini sıfırdan kurguladı.",
  },
  {
    year: "2023",
    title: "Platformun ilk sürümü",
    text: "Cep telefonu, vasıta ve emlak dikeyleriyle beta açıldı. 81 il altyapısı, doğrulanmış üyelik ve canlı satıcı sohbeti ilk günden ürünün omurgasına yerleştirildi.",
  },
  {
    year: "2024",
    title: "Güven ve vitrin",
    text: "Mavi doğrulanmış rozet, KVKK uyumlu çerez yönetimi ve VIP vitrin paketleri devreye alındı. Sahte ilan ve kötüye kullanıma karşı güvenlik katmanı güçlendirildi.",
  },
  {
    year: "2025",
    title: "Kategori derinliği",
    text: "İş makineleri, hobi, spor ve yaşam kategorileri eklendi. İlan verme sihirbazı marka–seri–model ve 81 il–ilçe kaskadıyla yenilendi.",
  },
  {
    year: "2026",
    title: "Ulusal dijital pazar yeri",
    text: "AlsatPort, modern, güvenli ve yenilikçi bir dijital pazar yeri vizyonuyla Türkiye genelinde ölçekleniyor. Mobil uygulamalar ve kurumsal mağaza ağı yol haritasının merkezinde.",
  },
];

export const CORP_STATS = [
  { value: "81", label: "İl kapsamı", hint: "Tüm ilçelerle birlikte Türkiye’nin her yerinden ilan" },
  { value: String(categories.length), label: "Ana kategori", hint: "Telefon, vasıta, emlak, makine ve yaşam" },
  { value: "3", label: "Üyelik planı", hint: "Standart, Profesyonel ve VIP" },
  { value: "10–40", label: "Fotoğraf hakkı", hint: "Plana göre ilan görseli limiti" },
  { value: "7/24", label: "Destek vizyonu", hint: "Güvenli alışveriş ve müşteri deneyimi" },
  { value: "KVKK", label: "Veri sorumlusu", hint: "AlsatPort Bilgi Teknolojileri A.Ş." },
];

export const JOBS = [
  {
    id: "fe",
    title: "Kıdemli Frontend Mühendisi",
    loc: "İstanbul / Hibrit",
    type: "Tam zamanlı",
    team: "Ürün",
  },
  {
    id: "trust",
    title: "Güven & Operasyon Uzmanı",
    loc: "İstanbul",
    type: "Tam zamanlı",
    team: "Güvenlik",
  },
  {
    id: "cs",
    title: "Müşteri Deneyimi Temsilcisi",
    loc: "Uzaktan",
    type: "Tam zamanlı",
    team: "Destek",
  },
  {
    id: "pm",
    title: "İlan Ürün Yöneticisi",
    loc: "İstanbul / Hibrit",
    type: "Tam zamanlı",
    team: "Ürün",
  },
];

export const NEWS = [
  {
    slug: "vip-vitrin-yenilendi",
    date: "12 Eylül 2026",
    tag: "Ürün",
    title: "VIP vitrin ve fotoğraf limitleri yenilendi",
    summary:
      "Standart üyeler 10, VIP üyeler 40 görsele kadar ilan yayınlayabiliyor. Vitrin sıralaması güven skoruna göre güncellendi.",
    body: [
      "AlsatPort, ilan görünürlüğünü adil ve şeffaf kılmak için VIP vitrin kurallarını yeniledi. Standart üyelikte 10 fotoğraf sınırı korunurken Profesyonel planda 20, VIP’te 40 görsele kadar yükleme açıldı.",
      "Vitrin sıralamasında yalnızca ücretli öne çıkarma değil, doğrulanmış üyelik ve güncel ilan kalitesi de ağırlık kazanıyor. Böylece alıcılar daha güvenilir ilanlarla karşılaşıyor.",
    ],
  },
  {
    slug: "81-il-ilan-sihirbazi",
    date: "4 Ağustos 2026",
    tag: "Platform",
    title: "81 il ve kategoriye özel ilan sihirbazı yayında",
    summary:
      "Şehir seçince ilçeler otomatik geliyor. Vasıta ve emlak ilanlarında marka, seri, m² ve oda sayısı gibi alanlar dinamiğe bağlandı.",
    body: [
      "İlan Ver akışı, Türkiye’nin 81 ili ve ilçeleriyle kaskad seçime geçti. Kullanıcı şehri yazarak da filtreleyebiliyor.",
      "Vasıta dikeyinde marka–seri–model, emlak dikeyinde m², oda ve bina yaşı gibi alanlar kategoriye göre açılıyor. Amaç, AlsatPort’ta aramayı ve karşılaştırmayı kolaylaştırmak.",
    ],
  },
  {
    slug: "kvkk-cerez-aydinlatma",
    date: "24 Temmuz 2026",
    tag: "Uyumluluk",
    title: "KVKK ve çerez aydınlatma metni güncellendi",
    summary:
      "Veri sorumlusu unvanı, başvuru kanalları ve çerez kategorileri AlsatPort Bilgi Teknolojileri A.Ş. kimliğiyle yayımlandı.",
    body: [
      "Kurul ilkeleri ve 6698 sayılı Kanun’daki aydınlatma yükümlülüğü doğrultusunda metin yenilendi. Kullanıcılar footer’daki bağlantıdan tam metni modal olarak okuyabiliyor.",
      "Çerez tercihleri zorunlu, işlevsel, analitik ve pazarlama olarak ayrıldı. Reddetme yalnızca zorunlu çerezleri bırakıyor.",
    ],
  },
  {
    slug: "mobil-uygulama-yol-haritasi",
    date: "18 Haziran 2026",
    tag: "Mobil",
    title: "Google Play ve App Store yol haritası",
    summary:
      "Android ve iOS uygulamaları, web’deki koyu neon deneyimi cepte sürdürmek üzere geliştirme takviminde.",
    body: [
      "Footer’daki mağaza rozetleri, yaklaşan native deneyimin habercisi. İlk sürümde ilan arama, mesajlaşma ve ilan verme sihirbazı yer alacak.",
      "AlsatPort’un vizyonu; masada da, cepte de aynı güvenli pazar yeri deneyimini sunmak.",
    ],
  },
];

export function findNews(slug: string) {
  return NEWS.find((n) => n.slug === slug);
}
