export type SellerReview = {
  id: string;
  sellerId: string;
  listingId?: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  rating: number;
  text: string;
  createdAt: string;
};

export const seedReviews: SellerReview[] = [
  {
    id: "r1",
    sellerId: "u-ekrem",
    listingId: "l1",
    authorId: "u-merve",
    authorName: "Merve Kaya",
    authorAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "Cihaz tam anlatıldığı gibi geldi. Paketleme özenli, iletişim çok hızlıydı. Güvenle tavsiye ederim.",
    createdAt: "3 gün önce",
  },
  {
    id: "r2",
    sellerId: "u-ekrem",
    listingId: "l1",
    authorId: "u-ahmet",
    authorName: "Ahmet Yılmaz",
    authorAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "Randevu saatine uydu, ürünü yerinde kontrol ettik. Hiç sorun yaşamadım.",
    createdAt: "1 hafta önce",
  },
  {
    id: "r3",
    sellerId: "u-ekrem",
    authorId: "u-selim",
    authorName: "Selim Demir",
    authorAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    rating: 4,
    text: "Teslimat biraz gecikti ama satıcı sürekli bilgi verdi. Ürün temiz.",
    createdAt: "2 hafta önce",
  },
  {
    id: "r4",
    sellerId: "u-ekrem",
    authorId: "u-fatma",
    authorName: "Fatma Yıldız",
    authorAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "İkinci alışverişim, yine aynı özen. AlsatPort’ta aradığım güven bu.",
    createdAt: "3 hafta önce",
  },
  {
    id: "r5",
    sellerId: "u-ekrem",
    authorId: "u-ayse",
    authorName: "Zeynep Arslan",
    authorAvatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "Fatura ve kutusu eksiksizdi. Mesajlara dakikalar içinde dönüş yaptı.",
    createdAt: "1 ay önce",
  },
  {
    id: "r11",
    sellerId: "u-ekrem",
    authorId: "u-burak",
    authorName: "Burak Çelik",
    authorAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "Ödeme ve teslimat sorunsuzdu. Tekrar alırım.",
    createdAt: "5 hafta önce",
  },
  {
    id: "r12",
    sellerId: "u-ekrem",
    authorId: "u-guest-1",
    authorName: "Caner Aksoy",
    authorAvatar:
      "https://images.unsplash.com/photo-1599566150163-29194bcaad46?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "İlan fotoğrafları gerçeği yansıtıyor. Pazarlık da makuldü.",
    createdAt: "6 hafta önce",
  },
  {
    id: "r13",
    sellerId: "u-ekrem",
    authorId: "u-guest-2",
    authorName: "Elif Koç",
    authorAvatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "Kutu açılmamış gibiydi. Teşekkürler.",
    createdAt: "2 ay önce",
  },
  {
    id: "r14",
    sellerId: "u-ekrem",
    authorId: "u-guest-3",
    authorName: "Onur Şahin",
    authorAvatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "Aynı gün kargoladı. Çok memnunum.",
    createdAt: "2 ay önce",
  },
  {
    id: "r15",
    sellerId: "u-ekrem",
    authorId: "u-guest-4",
    authorName: "Deniz Acar",
    authorAvatar:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "Güvenilir satıcı, her şey net.",
    createdAt: "3 ay önce",
  },
  {
    id: "r6",
    sellerId: "u-selim",
    listingId: "l2",
    authorId: "u-ekrem",
    authorName: "ekrem1987",
    authorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "Araç ekspertiz raporuyla geldi. Pazarlık şeffaftı, memnun kaldım.",
    createdAt: "5 gün önce",
  },
  {
    id: "r7",
    sellerId: "u-selim",
    authorId: "u-burak",
    authorName: "Burak Çelik",
    authorAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
    rating: 4,
    text: "Km ve donanım ilandaki gibi. Teslim noktası biraz uzaktı.",
    createdAt: "2 hafta önce",
  },
  {
    id: "r8",
    sellerId: "u-ayse",
    listingId: "l3",
    authorId: "u-merve",
    authorName: "Merve Kaya",
    authorAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "Daireyi gösterirken çok ilgiliydi. Sorularımı eksiksiz yanıtladı.",
    createdAt: "4 gün önce",
  },
  {
    id: "r9",
    sellerId: "u-ahmet",
    authorId: "u-fatma",
    authorName: "Fatma Yıldız",
    authorAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    rating: 5,
    text: "MacBook tertemiz. Orijinal kutu ve fatura vardı.",
    createdAt: "6 gün önce",
  },
  {
    id: "r10",
    sellerId: "u-merve",
    authorId: "u-ahmet",
    authorName: "Ahmet Yılmaz",
    authorAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    rating: 4,
    text: "Ürün güzel, kargo biraz yavaştı. Satıcı özür diledi.",
    createdAt: "1 hafta önce",
  },
];

export function summarizeReviews(reviews: SellerReview[]) {
  const count = reviews.length;
  if (!count) {
    return { avg: 0, count: 0, dist: [0, 0, 0, 0, 0] as number[] };
  }
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  const dist = [1, 2, 3, 4, 5].map((n) => reviews.filter((r) => r.rating === n).length);
  return { avg: Math.round((sum / count) * 10) / 10, count, dist };
}

export type RatingBadge = { label: string; tone: "lime" | "blue" | "orange" };

export function ratingBadges(avg: number, count: number, verified: boolean): RatingBadge[] {
  const badges: RatingBadge[] = [];
  if (verified) badges.push({ label: "Doğrulanmış", tone: "blue" });
  if (count >= 5 && avg >= 4.8) badges.push({ label: "Süper Satıcı", tone: "lime" });
  else if (count >= 3 && avg >= 4.5) badges.push({ label: "Yüksek Puan", tone: "orange" });
  if (count >= 10) badges.push({ label: "Çok Değerlendirilen", tone: "lime" });
  else if (count >= 1) badges.push({ label: `${count} değerlendirme`, tone: "orange" });
  return badges;
}
