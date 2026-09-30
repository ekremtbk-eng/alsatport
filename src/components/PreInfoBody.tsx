import Link from "next/link";
import {
  CAYMA_YOK,
  LEGAL_BRAND,
  LEGAL_EMAIL_DESTEK,
  LEGAL_EMAIL_KVKK,
  LEGAL_UPDATED,
} from "@/data/legal";

export function PreInfoBody({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`legal-prose leading-relaxed ${compact ? "text-[13px]" : "text-sm"}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">Yasal metin</p>
      <h1 className={`mt-1 font-extrabold ${compact ? "text-xl" : "text-2xl md:text-3xl"}`}>
        Ön Bilgilendirme Koşulları
      </h1>
      <p className="mt-2 text-muted">Son güncelleme: {LEGAL_UPDATED}</p>
      <p className="mt-3 rounded-xl border border-orange/40 bg-orange/10 px-3 py-2 font-semibold text-ink">
        {CAYMA_YOK}.
      </p>
      <p className="mt-5 text-soft">
        6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca {LEGAL_BRAND}, mesafeli
        sözleşmenin kurulmasından önce Alıcı’yı aşağıdaki hususlarda bilgilendirir. Bu metin,
        Mesafeli Satış Sözleşmesi’nin ayrılmaz parçasıdır.
      </p>
      <h2>1. Sağlayıcı</h2>
      <p>
        Destek: {LEGAL_EMAIL_DESTEK}. KVKK: {LEGAL_EMAIL_KVKK}.
      </p>
      <h2>2. Hizmetin temel nitelikleri</h2>
      <p>
        Satın alınan ürün; {LEGAL_BRAND} ilan kotası, yayında kalma süresi ve/veya vitrin (doping)
        görünürlüğü sağlayan dijital üyelik veya eklenti hizmetidir. Hizmet, ödemenin doğrulanması
        anında elektronik olarak ifa edilir; kargo veya fiziki teslimat yoktur.
      </p>
      <h2>3. Bedel ve ek masraflar</h2>
      <p>
        Satış bedeli ödeme sayfasındaki sipariş özetinde KDV dahil gösterilir. Ödeme kuruluşu veya
        kart kuruluşunun kendi komisyonları Alıcı’nın bankasına tabi olabilir. AlsatPort, kart
        verisi saklamaz.
      </p>
      <h2>4. İfa zamanı</h2>
      <p>
        3D Secure SMS kodunun doğrulanması üzerine paket veya doping, Alıcı hesabına derhal
        tanımlanır. Bu an, hizmetin ifa anıdır.
      </p>
      <h2>5. Cayma, iade ve iptal</h2>
      <p>
        {CAYMA_YOK}. Dijital içeriğin ifasına ve anında ifa edilen hizmete Alıcı’nın açık onayı ile
        başlanır; bu nedenle cayma hakkı kullanılamaz.
      </p>
      <h2>6. Ödeme güvenliği</h2>
      <p>
        Tahsilat 3D Secure ve SMS OTP ile yapılır. Kart numarası, son kullanma tarihi ve güvenlik
        kodu {LEGAL_BRAND} veritabanına yazılmaz; işlem ödeme kuruluşunun güvenli alanında
        sonuçlanır (simülasyon ortamında yalnızca doğrulama kodu üretilir, kart verisi sunucuya
        iletilmez).
      </p>
      <h2>7. Şikâyet ve başvuru</h2>
      <p>
        {LEGAL_EMAIL_DESTEK} ve {LEGAL_EMAIL_KVKK}. Tüketici mevzuatı kapsamındaki haklar saklıdır; cayma
        istisnası işbu ön bilgilendirme ve Mesafeli Satış Sözleşmesi ile ayrıca kabul edilir. Tam
        metin: <Link href="/on-bilgilendirme">alsatport.com/on-bilgilendirme</Link>.
      </p>
    </div>
  );
}
