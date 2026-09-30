import Link from "next/link";
import {
  CAYMA_YOK,
  LEGAL_BRAND,
  LEGAL_EMAIL_DESTEK,
  LEGAL_EMAIL_KVKK,
  LEGAL_KEP,
  LEGAL_UPDATED,
  LEGAL_WEB,
} from "@/data/legal";

export function DistanceSalesBody({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`legal-prose leading-relaxed ${compact ? "text-[13px]" : "text-sm"}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">Yasal metin</p>
      <h1 className={`mt-1 font-extrabold ${compact ? "text-xl" : "text-2xl md:text-3xl"}`}>
        Mesafeli Satış Sözleşmesi
      </h1>
      <p className="mt-2 text-muted">Son güncelleme: {LEGAL_UPDATED}</p>
      <p className="mt-3 rounded-xl border border-orange/40 bg-orange/10 px-3 py-2 font-semibold text-ink">
        {CAYMA_YOK}.
      </p>
      <p className="mt-5 text-soft">
        İşbu Mesafeli Satış Sözleşmesi (“Sözleşme”), 6502 sayılı Tüketicinin Korunması Hakkında
        Kanun, Mesafeli Sözleşmeler Yönetmeliği, 6563 sayılı Elektronik Ticaretin Düzenlenmesi
        Hakkında Kanun ve ilgili ikincil mevzuat çerçevesinde; satıcı/sağlayıcı{" "}
        <strong>{LEGAL_BRAND}</strong> (“Satıcı”) ile {LEGAL_BRAND} platformu
        üzerinden üyelik paketi, doping veya benzeri dijital hizmet satın alan tüketici (“Alıcı”)
        arasında, elektronik ortamda kurulur. Alıcı, ödemeyi onaylamadan önce işbu metni ve Ön
        Bilgilendirme Koşulları’nı okuduğunu, anladığını ve kabul ettiğini beyan eder.
      </p>
      <h2>1. Taraflar</h2>
      <ul>
        <li>
          <strong>Satıcı:</strong> {LEGAL_BRAND}
        </li>
        <li>
          <strong>E-posta:</strong> {LEGAL_EMAIL_DESTEK}
        </li>
        <li>
          <strong>KVKK:</strong> {LEGAL_EMAIL_KVKK}
        </li>
        <li>
          <strong>KEP:</strong> {LEGAL_KEP}
        </li>
        <li>
          <strong>Web:</strong> {LEGAL_WEB}
        </li>
        <li>
          <strong>Alıcı:</strong> Ödeme anında {LEGAL_BRAND} hesabında kayıtlı ad, soyad, e-posta ve
          iletişim bilgileri esas alınır.
        </li>
      </ul>
      <h2>2. Konu</h2>
      <p>
        Sözleşme’nin konusu, Alıcı’nın {LEGAL_BRAND} üzerinden seçtiği dijital üyelik paketi
        (Profesyonel, VIP) veya anında ifa edilen doping/vitrin hizmetinin, belirtilen bedel
        karşılığında elektronik ortamda sunulmasıdır. Hizmet, fiziksel teslimat içermez; ifa,
        ödemenin 3D Secure / SMS OTP ile doğrulanması üzerine hesabın tanımlanmasıyla tamamlanır.
      </p>
      <h2>3. Bedel, ödeme ve ifa</h2>
      <p>
        Bedel, sipariş özetinde Türk Lirası (TRY) cinsinden ve varsa döviz karşılığı ile gösterilir.
        Tahsilat, PCI-DSS uyumlu ödeme kuruluşları (Iyzico, PayTR, Stripe, PayPal veya kripto ödeme
        altyapısı) üzerinden yapılır. Kart numarası, son kullanma tarihi ve CVV AlsatPort
        sistemlerinde saklanmaz. Ödeme, banka 3D Secure SMS doğrulaması tamamlanmadan onaylanmaz;
        paket hesaba tanımlandığı anda hizmet ifa edilmiş sayılır.
      </p>
      <h2>4. Cayma hakkı — dijital içerik ve anında ifa</h2>
      <p>
        {CAYMA_YOK}. Alıcı, Mesafeli Sözleşmeler Yönetmeliği’nin dijital içerik ve anında ifa edilen
        hizmetlere ilişkin istisnalarını kabul eder. Onay kutusu işaretlenmeden ödeme başlatılmaz.
      </p>
      <h2>5. Ayıplı ifa ve şikâyet</h2>
      <p>
        Hizmetin teknik olarak hesaba yansımaması halinde Alıcı, {LEGAL_EMAIL_DESTEK} ve{" "}
        {LEGAL_EMAIL_KVKK} üzerinden başvurur. Tüketici şikâyetleri il tüketici hakem heyetleri ve tüketici mahkemeleri
        nezdinde ileri sürülebilir. Uyuşmazlıklarda Türkiye Cumhuriyeti hukuku ve İstanbul
        (Çağlayan) mahkemeleri / icra daireleri yetkilidir; tüketicinin kanuni yetki kuralları
        saklıdır.
      </p>
      <h2>6. Yürürlük</h2>
      <p>
        Alıcı’nın yasal onay kutusunu işaretleyip 3D Secure doğrulamasını tamamlaması ile Sözleşme
        elektronik ortamda kurulmuş ve ifa edilmiş olur. Tam metin:{" "}
        <Link href="/mesafeli-satis">alsatport.com/mesafeli-satis</Link>.
      </p>
    </div>
  );
}
