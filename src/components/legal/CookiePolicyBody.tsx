import Link from "next/link";
import { CookiePrefsLink } from "@/components/CookiePrefsLink";
import { LEGAL_BRAND, LEGAL_PRIVACY_EMAIL } from "@/data/legal";
import { LEGAL_SERVICES } from "@/lib/legalServices";
import { LegalHeader, LegalToc, Mail } from "@/components/legal/LegalUi";

type Row = { name: string; provider: string; purpose: string; duration: string; category: string };

const FIRST_PARTY = `${LEGAL_BRAND} (birinci taraf)`;

const COOKIES: Row[] = [
  { name: "ap_session", provider: FIRST_PARTY, purpose: "Oturum erişim anahtarı; giriş yaptığınızı doğrular", duration: "15 dakika", category: "Zorunlu" },
  { name: "ap_refresh", provider: FIRST_PARTY, purpose: "Oturumu yenileme anahtarı; tekrar giriş yapmadan oturumun sürmesini sağlar", duration: "7 gün", category: "Zorunlu" },
  { name: "ap_csrf", provider: FIRST_PARTY, purpose: "Siteler arası istek sahteciliğine (CSRF) karşı güvenlik anahtarı", duration: "7 gün", category: "Zorunlu" },
  { name: "ap_did", provider: FIRST_PARTY, purpose: "Rastgele cihaz kimliği; güvenilen cihaz eşleştirmesi, istek sınırlaması ve çoklu hesapla kötüye kullanımın önlenmesi. Reklam veya izleme amacıyla kullanılmaz, başka sitelerle paylaşılmaz", duration: "400 gün", category: "Zorunlu (güvenlik)" },
  { name: "ap_2fa", provider: FIRST_PARTY, purpose: "Şifre doğrulandıktan sonra iki adımlı doğrulama kodunun beklendiğini belirtir; tek başına oturum açmaz", duration: "10 dakika", category: "Zorunlu" },
  { name: "ap_tdev", provider: FIRST_PARTY, purpose: "Yalnızca “bu cihazı hatırla” seçeneğini işaretlerseniz: bu cihazda iki adımlı doğrulamayı tekrar sormamak için", duration: "60 gün", category: "Zorunlu (sizin talebinizle)" },
  { name: "ap_oauth_nonce", provider: FIRST_PARTY, purpose: "Google ile giriş sırasında isteğin sahte olmadığını doğrulayan tek kullanımlık değer", duration: "10 dakika", category: "Zorunlu" },
  { name: "ap_qrs", provider: FIRST_PARTY, purpose: "QR kod ile giriş sırasında giriş isteğini bu tarayıcıya bağlar", duration: "2 dakika", category: "Zorunlu" },
];

const LOCAL: Row[] = [
  { name: "alsatport-consent-v3", provider: FIRST_PARTY, purpose: "Çerez tercihlerinizi ve tercih tarihini saklar", duration: "Tercihinizi değiştirene veya tarayıcı verilerini silene kadar", category: "Zorunlu" },
  { name: "alsatport-state-v9", provider: FIRST_PARTY, purpose: "Uygulama durumu: bildirimleriniz, fiyatını takip ettiğiniz ilanlar, giriş yapmadan kaydettiğiniz aramalar ve bildirim tercihleri. Konum bilgisi yalnızca işlevsel çerezlere izin verdiyseniz saklanır", duration: "Tarayıcı verilerini silene kadar", category: "Zorunlu (talep ettiğiniz özellikler); konum: İşlevsel" },
  { name: "alsatport-i18n-v1", provider: FIRST_PARTY, purpose: "Seçtiğiniz site dili", duration: "Tarayıcı verilerini silene kadar", category: "Zorunlu (sizin seçiminiz)" },
  { name: "alsatport-reduced-motion", provider: FIRST_PARTY, purpose: "Animasyonları azaltma tercihiniz", duration: "Tarayıcı verilerini silene kadar", category: "Zorunlu (sizin seçiminiz)" },
  { name: "alsatport-compare-v1", provider: FIRST_PARTY, purpose: "Karşılaştırma listesine eklediğiniz ilanlar", duration: "İzin varsa tarayıcı verilerini silene kadar; izin yoksa yalnızca sekme açıkken (sessionStorage)", category: "İşlevsel" },
  { name: "alsatport-loyalty-seen-v1", provider: FIRST_PARTY, purpose: "Üyelik yıl dönümü kutlamasını tekrar göstermemek için", duration: "İzin varsa kalıcı; izin yoksa yalnızca sekme açıkken", category: "İşlevsel" },
  { name: "alsatport-special-day-seen-v1", provider: FIRST_PARTY, purpose: "Özel gün kutlamasını aynı gün tekrar göstermemek için", duration: "İzin varsa kalıcı; izin yoksa yalnızca sekme açıkken", category: "İşlevsel" },
];

const SESSION: Row[] = [
  { name: "ap_device_fp", provider: FIRST_PARTY, purpose: "Tarayıcı özelliklerinden üretilen ve geri döndürülemeyen cihaz özeti; giriş/kayıt isteklerinde kötüye kullanımın önlenmesi için sunucuya gönderilir", duration: "Sekme kapanana kadar", category: "Zorunlu (güvenlik)" },
  { name: "ap-reset-token", provider: FIRST_PARTY, purpose: "Şifre sıfırlama işlemi sırasında sıfırlama bağlantısındaki anahtarı geçici olarak tutar", duration: "Sekme kapanana kadar", category: "Zorunlu" },
  { name: "alsatport-listing-draft", provider: FIRST_PARTY, purpose: "İlan verme formunda girdiğiniz bilgilerin sayfa yenilenince kaybolmaması", duration: "Sekme kapanana kadar", category: "Zorunlu (talep ettiğiniz özellik)" },
  { name: "alsatport-flash-v1", provider: FIRST_PARTY, purpose: "Sayfa geçişinden sonra bir kez gösterilecek bilgi mesajı", duration: "Sekme kapanana kadar", category: "Zorunlu" },
  { name: "alsatport-splash-v1", provider: FIRST_PARTY, purpose: "Açılış animasyonunun aynı oturumda tekrar gösterilmemesi", duration: "Sekme kapanana kadar", category: "Zorunlu" },
  { name: "ap-profile-nudge:<kullanıcı>", provider: FIRST_PARTY, purpose: "Profil tamamlama hatırlatmasını aynı oturumda tekrar göstermemek için", duration: "Sekme kapanana kadar", category: "Zorunlu" },
];

function Table({ rows, nameLabel }: { rows: Row[]; nameLabel: string }) {
  return (
    <div className="legal-table-wrap">
      <table className="legal-table">
        <thead>
          <tr>
            <th>{nameLabel}</th>
            <th>Sağlayıcı</th>
            <th>Amaç</th>
            <th>Süre</th>
            <th>Kategori</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>
                <code>{r.name}</code>
              </td>
              <td>{r.provider}</td>
              <td>{r.purpose}</td>
              <td>{r.duration}</td>
              <td>{r.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CookiePolicyBody() {
  return (
    <div className="legal-prose text-sm leading-relaxed">
      <LegalHeader kicker="Çerezler ve tarayıcı depolama" title="Çerez Politikası" />
      <p className="mt-4">
        Bu sayfa, {LEGAL_BRAND}’un tarayıcınızda kullandığı çerezleri ve çerez olmayan tarayıcı depolama
        alanlarını (localStorage, sessionStorage) eksiksiz olarak listeler. Listede olmayan hiçbir çerez veya
        depolama kaydı tarafımızca kullanılmaz.
      </p>
      <p>
        <strong>Şu anda sitede analitik (ziyaretçi istatistiği) veya pazarlama/reklam amaçlı hiçbir çerez, piksel
        ya da betik kullanılmamaktadır.</strong> Çerez tercihlerinizde bu kategoriler yer alır, ancak bu
        kategorilerde etkin bir hizmet yoktur; ileride eklenmesi hâlinde yalnızca izin verirseniz çalıştırılır ve bu
        sayfa güncellenir.
      </p>
      <p>
        Tercihlerinizi istediğiniz zaman değiştirebilirsiniz: <CookiePrefsLink />. İzninizi geri aldığınızda ilgili
        kategoriye ait kayıtlar tarayıcınızdan silinir.
      </p>

      <LegalToc
        items={[
          ["#cerez-kategoriler", "Kategoriler"],
          ["#cerez-liste", "Çerezler"],
          ["#cerez-local", "localStorage"],
          ["#cerez-session", "sessionStorage"],
          ["#cerez-ucuncu", "Üçüncü taraf içerik"],
          ["#cerez-yonetim", "Yönetim"],
        ]}
      />

      <section id="cerez-kategoriler" className="mt-6">
        <h2>1. Kategoriler</h2>
        <ul>
          <li>
            <strong>Zorunlu:</strong> oturum açma, güvenlik ve sizin açıkça talep ettiğiniz özelliklerin çalışması
            için gereklidir; kapatılamaz. Hukuki sebep: KVKK m.5/2(c) ve (f).
          </li>
          <li>
            <strong>İşlevsel:</strong> karşılaştırma listesi gibi tercihlerin kalıcı olarak hatırlanması, konumunuzun
            hatırlanması ve harita gömmelerinin (OpenStreetMap, Google Haritalar) otomatik yüklenmesi. Varsayılan
            olarak kapalıdır; yalnızca izin verirseniz etkinleşir.
          </li>
          <li>
            <strong>Analitik:</strong> varsayılan olarak kapalıdır. Şu anda bu kategoride kullanılan bir hizmet yoktur.
          </li>
          <li>
            <strong>Pazarlama:</strong> varsayılan olarak kapalıdır. Şu anda bu kategoride kullanılan bir hizmet yoktur.
          </li>
        </ul>
      </section>

      <section id="cerez-liste">
        <h2>2. Çerezler</h2>
        <p>Tümü birinci taraf, HttpOnly (sayfa betikleri tarafından okunamaz) ve SameSite=Lax çerezlerdir.</p>
        <Table rows={COOKIES} nameLabel="Çerez" />
      </section>

      <section id="cerez-local">
        <h2>3. Tarayıcı depolama alanı: localStorage</h2>
        <p>
          localStorage çerez değildir; bilgiler yalnızca tarayıcınızda tutulur ve sunucuya kendiliğinden gönderilmez.
        </p>
        <Table rows={LOCAL} nameLabel="Anahtar" />
      </section>

      <section id="cerez-session">
        <h2>4. Tarayıcı depolama alanı: sessionStorage</h2>
        <p>sessionStorage kayıtları sekmeyi veya tarayıcıyı kapattığınızda otomatik olarak silinir.</p>
        <Table rows={SESSION} nameLabel="Anahtar" />
      </section>

      <section id="cerez-ucuncu">
        <h2>5. Üçüncü taraf içerik</h2>
        <ul>
          <li>
            <strong>OpenStreetMap / Google Haritalar (işlevsel):</strong> ilan konumu haritası yalnızca işlevsel
            çerezlere izin verdiyseniz veya “haritayı yükle” düğmesine bastığınızda yüklenir. Google Haritalar uydu
            görünümü yüklendiğinde Google kendi çerezlerini yerleştirebilir.
          </li>
          {LEGAL_SERVICES.recaptcha ? (
            <li>
              <strong>Google reCAPTCHA (zorunlu, güvenlik):</strong> yalnızca üye olma formu açıldığında yüklenir ve
              Google kendi çerezlerini (ör. <code>_GRECAPTCHA</code>) yerleştirebilir. Diğer sayfalarda yüklenmez.
            </li>
          ) : null}
          <li>
            <strong>Görseller:</strong> bazı kategori görselleri Unsplash’ten, Google ile giriş yapan kullanıcıların
            profil fotoğrafları Google sunucularından yüklenir. Bu isteklerde çerez yerleştirmeyiz; ancak tarayıcınız
            IP adresinizi ilgili sunucuya iletir.
          </li>
        </ul>
      </section>

      <section id="cerez-yonetim">
        <h2>6. Tercihlerin yönetimi</h2>
        <p>
          İlk ziyaretinizde gösterilen bilgilendirmede “Tümünü Kabul Et”, “Tümünü Reddet” ve “Tercihleri Yönet”
          seçenekleri eşit şekilde sunulur. “Tümünü Reddet” yalnızca zorunlu çerezleri bırakır. Kararınızı sayfa
          altındaki “Çerez Tercihleri” bağlantısından istediğiniz zaman değiştirebilirsiniz. Tarayıcınızın
          ayarlarından da çerezleri ve site verilerini silebilirsiniz; zorunlu çerezleri silerseniz oturumunuz kapanır.
        </p>
        <p>
          Kişisel verilerinizin işlenmesine ilişkin ayrıntılar için{" "}
          <Link href="/kvkk" className="font-semibold text-lime">
            KVKK Aydınlatma Metni
          </Link>{" "}
          ve{" "}
          <Link href="/gizlilik-politikasi" className="font-semibold text-lime">
            Gizlilik Politikası
          </Link>
          ’na bakabilirsiniz. Sorularınız için: <Mail to={LEGAL_PRIVACY_EMAIL} />
        </p>
      </section>
    </div>
  );
}
