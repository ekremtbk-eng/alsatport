import { findCategory, rootOf } from "@/data/categories";
import { vehicleProfileFromCategoryId } from "@/data/listingOptions";

function has(id: string, ...parts: string[]) {
  return parts.some((p) => id.includes(p));
}

function titleExample(id: string, root: string, attrs?: Record<string, string>): string {
  if (root === "services" || id === "services" || id.startsWith("services-")) {
    if (has(id, "services-move")) return "Asansörlü Evden Eve Nakliyat";
    if (has(id, "services-repair-phone")) return "iPhone ve Android Ekran Değişimi";
    if (has(id, "services-repair-pc")) return "Bilgisayar Format ve Donanım Tamiri";
    if (has(id, "services-repair-appliance")) return "Buzdolabı ve Çamaşır Makinesi Servisi";
    if (has(id, "services-repair-roof", "services-repair-lift")) return "Çatı Tamiri ve Su İzolasyonu";
    if (has(id, "services-repair")) return "Kombi Bakım ve Petek Temizliği";
    if (has(id, "services-auto-tow")) return "7/24 Çekici ve Yol Yardım";
    if (has(id, "services-auto-inspect")) return "Oto Ekspertiz ve Boya Ölçümü";
    if (has(id, "services-auto-body")) return "Kaporta Düzeltme ve Parça Boya";
    if (has(id, "services-auto")) return "Yetkili Servis Periyodik Bakım";
    if (has(id, "services-event-catering")) return "Düğün ve Özel Gün Catering Hizmeti";
    if (has(id, "services-event-av")) return "Düğün Ses Işık ve Görüntü Sistemi";
    if (has(id, "services-event")) return "Düğün ve Nişan Organizasyonu";
    if (has(id, "services-reno-paint")) return "Profesyonel Ev Boyama ve Badana Hizmeti";
    if (has(id, "services-reno-elec")) return "Elektrik Tesisatı Döşeme ve Aydınlatma";
    if (has(id, "services-reno-plumb")) return "Su Kaçağı Tespiti ve Tesisat Tamiri";
    if (has(id, "services-reno-insul")) return "Mantolama ve Isı Yalıtımı";
    if (has(id, "services-reno-surface")) return "Fayans ve Seramik Döşeme";
    if (has(id, "services-reno-furn")) return "Mobilya Montaj ve Koltuk Döşeme";
    if (has(id, "services-reno-arch")) return "İç Mimari Proje ve Uygulama";
    if (has(id, "services-other-preschool")) return "Güvenilir Anaokulu ve Çocuk Bakım Hizmeti";
    if (has(id, "services-other")) return "Profesyonel Ev ve İş Yeri Hizmeti";
    return "Profesyonel Ev Boyama ve Badana Hizmeti";
  }

  if (root === "vasita") {
    return vasitaTitleExample(id, attrs);
  }

  if (root === "emlak") {
    if (has(id, "arsa")) return "Yatırımlık İmarlı Arsa, Merkezi Konum";
    if (has(id, "isyeri", "dukkan", "ofis", "depo", "plaza")) return "Ana Cadde Üzeri Satılık Dükkan";
    if (has(id, "gunluk")) return "Merkezi Konumda Turistik Günlük Kiralık Daire";
    if (has(id, "kiralik")) return "Merkezi Konumda Eşyalı 2+1 Kiralık Daire";
    if (has(id, "devren")) return "Devren Satılık Konut, Site İçerisinde";
    if (has(id, "villa", "mustakil", "yazlik")) return "Deniz Manzaralı Satılık Villa";
    return "Merkezi Konumda 3+1 Satılık Ferah Daire";
  }

  if (root === "jobs") {
    if (has(id, "beauty-women-hair", "beauty-men-hair")) return "Deneyimli Kuaför Aranıyor";
    if (has(id, "beauty-specialist", "beauty-makeup")) return "Güzellik Uzmanı / Makyöz Aranıyor";
    if (has(id, "beauty")) return "Güzellik ve Bakım Uzmanı Aranıyor";
    return "Tam Zamanlı Satış Temsilcisi Aranıyor";
  }

  if (root === "tutors") {
    if (has(id, "lang")) return "YDS / YÖKDİL İngilizce Özel Ders";
    if (has(id, "uni")) return "YKS Matematik Özel Ders, Deneyimli Öğretmen";
    return "LGS Matematik Özel Ders (Evde / Online)";
  }

  if (root === "helpers") {
    if (has(id, "child")) return "Referanslı Bebek ve Çocuk Bakıcısı";
    if (has(id, "elder")) return "Yatılı Yaşlı ve Hasta Bakıcısı";
    if (has(id, "clean")) return "Haftalık Ev Temizlik Yardımcısı";
    return "Ev İşlerine Yardımcı Aranıyor";
  }

  if (root === "machines") {
    return "2018 Model JCB 3CX Beko Loder";
  }

  if (root === "parts") {
    if (has(id, "kask", "gear", "helmet")) return "Shoei X-SPR Pro Marc Marquez Edition";
    if (has(id, "cam")) return "4K Çift Kameralı Araç Kamerası";
    if (has(id, "spare")) return "Honda Civic Fd6 Ön Tampon, Sıfır Fabrikasyon";
    return "Orijinal BMW 320i Ön Tampon";
  }

  if (root === "pets") {
    return "Kedi Taşıma Çantası, Yıkanabilir";
  }

  if (has(id, "phone", "cep-telefon")) return "iPhone 15 Pro Max 128 GB, Kutulu";
  if (has(id, "computer", "laptop", "bilgisayar")) return "MacBook Air M2 256 GB";
  if (has(id, "fashion", "giyim")) return "Zara Trençkot, M Beden, Az Giyilmiş";
  if (has(id, "decor", "mobilya")) return "İkea Köşe Koltuk Takımı";
  if (has(id, "appliance", "beyaz")) return "Bosch Bulaşık Makinesi, Garantili";
  return "Az Kullanılmış, Kutulu, Fatura Mevcut";
}

function vasitaKindLabel(profile: ReturnType<typeof vehicleProfileFromCategoryId>) {
  switch (profile) {
    case "suv":
      return "SUV";
    case "ev":
      return "elektrikli";
    case "moto":
      return "motosiklet";
    case "atv":
      return "ATV";
    case "utv":
      return "UTV";
    case "van":
      return "minivan";
    case "ticari":
      return "ticari";
    case "rental":
      return "kiralık";
    case "deniz":
      return "tekne";
    case "damaged":
      return "hasarlı";
    case "caravan":
      return "karavan";
    case "classic":
      return "klasik";
    case "air":
      return "hava aracı";
    case "disabled":
      return "engelli plakalı";
    default:
      return "otomobil";
  }
}

function vasitaTitleExample(id: string, attrs?: Record<string, string>): string {
  const profile = vehicleProfileFromCategoryId(id);
  const kind = vasitaKindLabel(profile);
  const brand = attrs?.brand?.trim();
  const model = attrs?.model?.trim();
  const year = attrs?.year?.trim();
  const gear = attrs?.gear?.trim();
  if (brand || model || year) {
    const bits =
      profile === "damaged" ? ["Sahibinden"] : profile === "rental" ? ["Kiralık"] : ["Sahibinden", "Hatasız", "Boyasız"];
    if (year) bits.push(`${year} Model`);
    if (brand) bits.push(brand);
    if (model) bits.push(model);
    if (gear) bits.push(gear);
    bits.push(kind);
    return bits.join(" ");
  }
  switch (profile) {
    case "suv":
      return "Sahibinden Hatasız Boyasız 2023 Model Otomatik SUV";
    case "ev":
      return "Sahibinden 2023 Tesla Model 3 Long Range";
    case "moto":
      return "Sahibinden Temiz 2022 Honda CBR 250R";
    case "atv":
      return "Sahibinden 2022 Can-Am Outlander ATV";
    case "utv":
      return "Sahibinden 2021 Polaris RZR UTV";
    case "van":
    case "ticari":
      return "2020 Ford Transit Panelvan, Yüksek Tavan";
    case "rental":
      return "Günlük Kiralık Otomatik Dizel Otomobil";
    case "deniz":
      return "2021 Model Fiber Tekne, Bakımlı";
    case "damaged":
      return "Kaporta Hasarlı 2018 Model, Çalışır Vaziyette";
    case "caravan":
      return "2020 Model 4 Kişilik Motokaravan";
    case "classic":
      return "1974 Model Restore Klasik Otomobil";
    case "air":
      return "Cessna 172, Bakımlı, Uçuşa Hazır";
    case "disabled":
      return "El Kumandalı Engelli Plakalı Otomatik";
    default:
      return "Sahibinden Temiz, Boyasız 2022 Model Dizel Otomatik";
  }
}

function vasitaBodyExample(id: string): string {
  const profile = vehicleProfileFromCategoryId(id);
  if (profile === "ev") return "Menzil, batarya sağlığı, şarj ve bakım geçmişini yazın...";
  if (profile === "moto" || profile === "atv" || profile === "utv") {
    return "Motor hacmi, soğutma, bakım ve lastik durumunu yazın...";
  }
  if (profile === "van" || profile === "ticari") return "Yük kapasitesi, kasa tipi ve kullanım amacını yazın...";
  if (profile === "deniz") return "Tekne tipi, boy, motor ve bağlama yerini yazın...";
  if (profile === "air") return "Tip, uçuş saati ve bakım kayıtlarını yazın...";
  if (profile === "caravan") return "Yatak düzeni, donanım ve ruhsat bilgilerini yazın...";
  if (profile === "rental") return "Kiralama süresi, depozito ve teslim koşullarını yazın...";
  if (profile === "damaged") return "Hasar bölgesi, çalışırlık ve ekspertiz durumunu yazın...";
  return "Km, bakım geçmişi, hasar ve takas durumunu yazın...";
}

function bodyExample(root: string, id: string): string {
  if (root === "services") {
    return "Hizmet kapsamını, çalışma bölgenizi, süreyi ve deneyiminizi yazın...";
  }
  if (root === "vasita") {
    return vasitaBodyExample(id);
  }
  if (root === "emlak") {
    return "Konum, oda düzeni, aidat ve site özelliklerini yazın...";
  }
  if (root === "jobs") {
    return "Pozisyon, çalışma şekli, maaş aralığı ve aranan nitelikleri yazın...";
  }
  if (root === "tutors") {
    return "Ders içeriğini, seviye, yer (online/yüz yüze) ve ücret bilgisini yazın...";
  }
  if (root === "helpers") {
    return "Çalışma düzeni, deneyim ve beklenen koşulları yazın...";
  }
  if (root === "machines") {
    return "Çalışma saati, bakımlar ve teslim koşullarını yazın...";
  }
  if (root === "parts") {
    return "Uyumluluk, orijinal/muadil ve durum bilgilerini yazın...";
  }
  if (root === "pets") {
    return "Ürün türü, ölçü ve kullanım durumunu yazın...";
  }
  return "Ürünün durumunu, kutu/fatura ve teslim bilgisini yazın...";
}

export function listingTitlePlaceholder(
  categoryId: string,
  prefix = "Örn",
  attrs?: Record<string, string>,
): string {
  const cat = findCategory(categoryId);
  const root = cat ? rootOf(cat).id : categoryId;
  const id = cat?.id ?? categoryId;
  return `${prefix}: ${titleExample(id, root, attrs)}`;
}

export function listingBodyPlaceholder(categoryId: string): string {
  const cat = findCategory(categoryId);
  const root = cat ? rootOf(cat).id : categoryId;
  const id = cat?.id ?? categoryId;
  return bodyExample(root.startsWith("shopping") ? "shopping" : root, id);
}
