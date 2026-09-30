import Link from "next/link";
import {
  CAYMA_YOK,
  LEGAL_ADDRESS,
  LEGAL_BRAND,
  LEGAL_COMPANY,
  LEGAL_EMAIL_DESTEK,
  LEGAL_KEP,
  LEGAL_PHONE,
  LEGAL_WEB,
} from "@/data/legal";

const UPDATED = "30 Eylül 2026";

export function TermsOfServiceBody() {
  return (
    <div className="legal-prose text-sm leading-relaxed">
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">Yasal bildirim</p>
      <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">Kullanım Koşulları</h1>
      <p className="mt-2 text-muted">Son güncelleme: {UPDATED}</p>
      <p className="mt-1 text-muted">
        Hizmet sağlayıcı: <strong className="text-soft">{LEGAL_COMPANY}</strong>
      </p>

      <p className="mt-5 text-soft">
        {LEGAL_WEB} adresindeki {LEGAL_BRAND} platformunu ziyaret ederek, üye olarak, Google ile
        oturum açarak veya ilan/mesaj/ödeme işlemleri yaparak aşağıdaki koşulları kabul etmiş
        sayılırsınız. Koşulları kabul etmiyorsanız platformu kullanmayınız.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2 text-xs">
        {[
          ["#taraflar", "Taraflar"],
          ["#hizmet", "Hizmet"],
          ["#uyelik", "Üyelik ve Google"],
          ["#ilan", "İlanlar"],
          ["#yasak", "Yasaklar"],
          ["#sorumluluk", "Sorumluluk"],
          ["#uyusmazlik", "Uyuşmazlık"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="chip">
            {label}
          </a>
        ))}
      </nav>

      <section id="taraflar" className="mt-8 scroll-mt-24">
        <h2>1. Taraflar ve tanımlar</h2>
        <p>
          <strong>Şirket:</strong> {LEGAL_COMPANY}, {LEGAL_ADDRESS}. Tel: {LEGAL_PHONE}. Destek:{" "}
          {LEGAL_EMAIL_DESTEK}. KEP: {LEGAL_KEP}.
        </p>
        <p>
          <strong>Kullanıcı:</strong> Platformu ziyaret eden veya üye olan gerçek/tüzel kişi.{" "}
          <strong>Platform:</strong> {LEGAL_WEB} ve bağlı arayüzler. AlsatPort bir ilan
          pazaryeridir; kullanıcılar arasındaki alım satımın tarafı kural olarak kullanıcıların
          kendisidir.
        </p>
      </section>

      <section id="hizmet" className="mt-8 scroll-mt-24">
        <h2>2. Hizmetin konusu</h2>
        <p>
          AlsatPort; emlak, vasıta, ikinci el ürün ve hizmet ilanlarının yayımlanması, aranması,
          mesajlaşma ve (yapılandırıldığında) üyelik/vitrin paketlerinin satışına aracılık eder.
          İlanlar yönetici onayına tabi olabilir. Canlı hayvan satışı yasaktır. Şirket, hizmeti önceden
          duyurarak değiştirme veya geçici durdurma hakkını saklı tutar.
        </p>
      </section>

      <section id="uyelik" className="mt-8 scroll-mt-24">
        <h2>3. Üyelik, e-posta doğrulama ve Google ile giriş</h2>
        <p>
          Üyelik 18 yaşını doldurmuş kişiler içindir. E-posta/şifre veya Google OAuth ile hesap
          açılabilir. Google ile girişte Google’ın size gösterdiği izin ekranını onaylarsınız;
          AlsatPort yalnızca e-posta, ad ve profil fotoğrafı ile hesap kimliğini alır. Bu verilerin
          işlenmesi{" "}
          <Link href="/gizlilik-politikasi" className="font-semibold text-lime hover:underline">
            Gizlilik Politikası
          </Link>
          ’nda anlatılır.
        </p>
        <p>
          Hesap güvenliği (şifre, cihaz, e-posta erişimi) kullanıcıya aittir. Yanlış, başkasına ait
          veya yanıltıcı kimlik bilgisi kullanılamaz. Şirket, KVKK ve güvenlik gerekçesiyle hesabı
          askıya alabilir veya kapatabilir.
        </p>
      </section>

      <section id="ilan" className="mt-8 scroll-mt-24">
        <h2>4. İlan, içerik ve iletişim</h2>
        <p>
          İlan metni, görsel ve mesajların hukuka uygunluğu kullanıcıya aittir. Fikri mülkiyet,
          kişilik hakları, yanıltıcı reklam, sahte ilan ve müstehcen/çıplak içerik (profil fotoğrafı
          dâhil) yasaktır. Şirket içerikleri önceden veya sonradan denetleyebilir, kaldırmakta serbesttir.
          Kullanıcılar arası anlaşmazlıklarda AlsatPort aracı konumundadır; mal/hizmet teslimi
          tarafların sorumluluğundadır.
        </p>
      </section>

      <section id="yasak" className="mt-8 scroll-mt-24">
        <h2>5. Yasak kullanımlar</h2>
        <ul>
          <li>Yasalara aykırı mal/hizmet, canlı hayvan, sahte evrak, dolandırıcılık</li>
          <li>Başkasının hesabı, toplu bot, sisteme izinsiz erişim, zararlı yazılım</li>
          <li>Spam, nefret söylemi, müstehcen profil veya ilan görseli</li>
          <li>Google veya diğer kimlik sağlayıcılarının şartlarını ihlal</li>
        </ul>
      </section>

      <section className="mt-8 scroll-mt-24">
        <h2>6. Ücretler ve cayma</h2>
        <p>
          Temel gezinti ücretsiz olabilir; ücretli paketler ve tahsilat PayTR üzerinden, Türk Lirası
          ile yapılır. Kart verisi AlsatPort sunucularında tutulmaz. {CAYMA_YOK}. Ayrıntı:{" "}
          <Link href="/mesafeli-satis" className="font-semibold text-lime hover:underline">
            Mesafeli Satış Sözleşmesi
          </Link>{" "}
          ve{" "}
          <Link href="/on-bilgilendirme" className="font-semibold text-lime hover:underline">
            Ön Bilgilendirme
          </Link>
          .
        </p>
      </section>

      <section id="sorumluluk" className="mt-8 scroll-mt-24">
        <h2>7. Fikri haklar ve sorumluluk sınırı</h2>
        <p>
          AlsatPort markası, arayüz ve yazılım Şirket’e aittir. Kullanıcı, yüklediği içerikte
          gerekli haklara sahip olduğunu beyan eder ve Şirket’i üçüncü kişi taleplerine karşı
          tazminle yükümlü kılar. Platform “olduğu gibi” sunulur; kesinti, veri kaybı veya
          kullanıcılar arası işlemlerden doğan dolaylı zararlardan, kanunen müsaade edilen ölçüde,
          Şirket sorumlu tutulamaz.
        </p>
      </section>

      <section className="mt-8 scroll-mt-24">
        <h2>8. Sözleşmenin sona ermesi</h2>
        <p>
          Kullanıcı hesabını kapatabilir. Şirket, ihlal veya yasal zorunluluk halinde üyeliği sona
          erdirebilir. Sona erme, o ana kadar doğmuş borçları ve yasal saklama yükümlülüklerini
          etkilemez.
        </p>
      </section>

      <section id="uyusmazlik" className="mt-8 scroll-mt-24">
        <h2>9. Uygulanacak hukuk ve yetki</h2>
        <p>
          İşbu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Tüketici işlemlerinde 6502 sayılı
          Kanun ve yetkili tüketici hakem heyeti/mahkemesi saklıdır. Diğer uyuşmazlıklarda İstanbul
          (Çağlayan) mahkemeleri ve icra daireleri yetkilidir.
        </p>
        <p>
          Gizlilik:{" "}
          <Link href="/gizlilik-politikasi" className="font-semibold text-lime hover:underline">
            Gizlilik Politikası
          </Link>
          . Destek: {LEGAL_EMAIL_DESTEK}.
        </p>
      </section>
    </div>
  );
}
