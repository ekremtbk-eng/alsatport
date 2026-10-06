import { categories } from "@/data/categories";

export const CORPORATE_NAV = [
  { href: "/kurumsal/hakkimizda", slug: "hakkimizda", label: "Hakkımızda" },
  { href: "/kurumsal/dunden-bugune", slug: "dunden-bugune", label: "Platform Özeti" },
  { href: "/kurumsal/sayilarla", slug: "sayilarla", label: "Sayılarla AlsatPort" },
  { href: "/kurumsal/surdurulebilirlik", slug: "surdurulebilirlik", label: "Sürdürülebilirlik" },
  { href: "/kurumsal/insan-kaynaklari", slug: "insan-kaynaklari", label: "İnsan Kaynakları" },
  { href: "/kurumsal/haberler", slug: "haberler", label: "Haberler" },
  { href: "/kurumsal/iletisim", slug: "iletisim", label: "İletişim" },
] as const;

export const CORP_STATS = [
  { value: "81", label: "İl kapsamı", hint: "Tüm ilçelerle birlikte Türkiye’nin her yerinden ilan" },
  { value: String(categories.length), label: "Ana kategori", hint: "Telefon, vasıta, emlak, makine ve yaşam" },
  { value: "Ücretsiz", label: "Temel ilan hizmetleri", hint: "İlan verme ve mesajlaşma ücretsizdir" },
  { value: "E-posta", label: "Destek kanalı", hint: "E-posta ve otomatik destek merkezi" },
  { value: "KVKK", label: "Aydınlatma metni", hint: "Kişisel verilerin nasıl işlendiği /kvkk sayfasında" },
];

/** Only real, published openings belong here; the careers page shows a neutral note when empty. */
export const JOBS: { id: string; title: string; loc: string; type: string; team: string }[] = [];

export const NEWS = [
  {
    slug: "81-il-ilan-sihirbazi",
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
    tag: "Uyumluluk",
    title: "KVKK ve çerez aydınlatma metni güncellendi",
    summary:
      "KVKK aydınlatma metni, çerez politikası ve çerez tercihleri gerçek veri işleme faaliyetlerine göre yeniden düzenlendi.",
    body: [
      "Kurul ilkeleri ve 6698 sayılı Kanun’daki aydınlatma yükümlülüğü doğrultusunda metin yenilendi. Kullanıcılar footer’daki bağlantılardan tam metinlere ulaşabiliyor.",
      "Çerez tercihleri zorunlu, işlevsel, analitik ve pazarlama olarak ayrıldı. Reddetme yalnızca zorunlu çerezleri bırakıyor.",
    ],
  },
];

export function findNews(slug: string) {
  return NEWS.find((n) => n.slug === slug);
}
