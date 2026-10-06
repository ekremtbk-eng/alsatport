import Link from "next/link";
import { CookiePrefsLink } from "@/components/CookiePrefsLink";
import { LEGAL_BRAND, LEGAL_DOMAIN, LEGAL_PRIVACY_EMAIL } from "@/data/legal";
import { LEGAL_SERVICES } from "@/lib/legalServices";
import { ControllerIdentity, LegalHeader, LegalToc, Mail, ProcessorTable } from "@/components/legal/LegalUi";

export function PrivacyPolicyBody() {
  const s = LEGAL_SERVICES;
  return (
    <div className="legal-prose text-sm leading-relaxed">
      <LegalHeader kicker="Gizlilik" title="Gizlilik Politikası" />
      <p className="mt-4">
        Bu politika, {LEGAL_BRAND} ({LEGAL_DOMAIN}) kullanırken hangi bilgilerin toplandığını, ne için
        kullanıldığını, kimlerle paylaşıldığını ve bu bilgiler üzerinde hangi kontrollere sahip olduğunuzu sade bir
        dille anlatır. Hukuki sebepler, saklama süreleri ve KVKK kapsamındaki haklarınız{" "}
        <Link href="/kvkk" className="font-semibold text-lime">
          KVKK Aydınlatma Metni
        </Link>
        ’nde ayrıntılı olarak yer alır.
      </p>

      <LegalToc
        items={[
          ["#gp-kim", "Biz kimiz"],
          ["#gp-giris", "Giriş"],
          ["#gp-hesap", "Hesap ve profil"],
          ["#gp-ilan", "İlanlar"],
          ["#gp-mesaj", "Mesajlar"],
          ["#gp-guvenlik", "Güvenlik kayıtları"],
          ["#gp-cerez", "Çerezler"],
          ["#gp-ucuncu", "Üçüncü taraflar"],
          ["#gp-satis", "Veri satışı"],
          ["#gp-silme", "Silme"],
          ["#gp-iletisim", "İletişim"],
        ]}
      />

      <section id="gp-kim" className="mt-6">
        <h2>1. Biz kimiz</h2>
        <p>
          {LEGAL_BRAND}, kullanıcıların ikinci el ve sıfır ürün, araç, emlak ve hizmet ilanı yayımlayıp birbirleriyle
          mesajlaştığı bir ilan platformudur. {LEGAL_BRAND} alım-satımın tarafı değildir.
        </p>
        <ControllerIdentity />
      </section>

      <section id="gp-giris">
        <h2>2. Giriş yöntemleri</h2>
        <ul>
          <li>
            <strong>E-posta ve şifre:</strong> şifreniz yalnızca geri döndürülemez bir özet (bcrypt) olarak saklanır;
            çalışanlarımız dahil kimse şifrenizi göremez.
          </li>
          {s.google ? (
            <li>
              <strong>Google ile giriş:</strong> Google, giriş için gerekli olan yalnızca şu bilgileri bize iletir:
              Google hesap kimliği, ad-soyad, e-posta adresi ve profil fotoğrafı bağlantısı (OpenID Connect
              kapsamları: <code>openid</code>, <code>email</code>, <code>profile</code>). Google şifreniz bize hiçbir
              şekilde iletilmez; şifrenizi görmeyiz ve saklamayız. Rehber, takvim, Drive veya başka bir Google
              verisine erişim istemeyiz.
            </li>
          ) : null}
          <li>
            <strong>QR kod ile giriş:</strong> zaten giriş yapmış olduğunuz telefonunuzla başka bir tarayıcıda oturum
            açmanızı sağlar; bu sırada giriş isteyen tarayıcının tarayıcı bilgisi (user-agent) onay ekranında
            gösterilmek üzere kısa süreli saklanır.
          </li>
          <li>
            <strong>İki adımlı doğrulama (isteğe bağlı):</strong> açarsanız girişte e-posta adresinize 6 haneli kod
            gönderilir. Kodlar yalnızca özet olarak saklanır ve kısa sürede geçersiz olur.
          </li>
        </ul>
      </section>

      <section id="gp-hesap">
        <h2>3. Hesap ve profil bilgileri</h2>
        <p>
          Hesabınız için e-posta, ad-soyad ve kullanıcı adı; ilan verebilmek için ayrıca telefon numarası ve açık
          adres istenir. Açık adresiniz sunucuda şifrelenmiş olarak saklanır ve hiçbir ilanda veya profilde
          yayımlanmaz. Profil fotoğrafı yüklemek isteğe bağlıdır
          {s.sightengine ? "; yüklenen fotoğraflar uygunsuz içerik denetimi için otomatik olarak taranır" : ""}.
          Kurtarma e-postası ve iki adımlı doğrulama ayarları yalnızca siz eklerseniz tutulur. T.C. kimlik numarası,
          kimlik belgesi veya ödeme bilgisi istenmez.
        </p>
      </section>

      <section id="gp-ilan">
        <h2>4. İlanlar</h2>
        <p>
          Yayımladığınız ilanın başlığı, açıklaması, fiyatı, özellikleri, fotoğrafları ve il/ilçe/mahalle bilgisi
          herkese açıktır. Harita konumu, girdiğiniz il/ilçe/mahalle bilgisinden yaklaşık olarak hesaplanır;
          cihazınızın GPS konumu ilana eklenmez. İlanda satıcı adı olarak adınız ve soyadınızın baş harfi (ör. “Ayşe
          K.”) ya da yönetici tarafından doğrulanmış işletme adınız görünür. Telefon numaranız yalnızca giriş yapmış
          üyelere gösterilir; giriş yapmamış ziyaretçiler numarayı maskeli görür.
        </p>
        <p>
          Fotoğraflarınızda kişisel veri (yüz, plaka, adres, belge) bulunmamasına dikkat ediniz. Ayrıntılar için{" "}
          <Link href="/ilan-kurallari" className="font-semibold text-lime">
            İlan Kuralları
          </Link>
          ’na bakınız.
        </p>
      </section>

      <section id="gp-mesaj">
        <h2>5. Mesajlaşma</h2>
        <p>
          Mesajlarınız yalnızca yazıştığınız kullanıcıya iletilir ve hesabınızda saklanır. Mesajlar reklam veya
          profilleme amacıyla okunmaz ya da analiz edilmez. Bir mesaj şikâyet edildiğinde veya kötüye kullanım
          şüphesi bulunduğunda yetkili yöneticiler ilgili yazışmayı inceleyebilir. Okundu bilgisini ayarlarınızdan
          kapatabilirsiniz. Platform dışına (ör. kapora için banka hesabı) yönlendiren mesajlara itibar etmeyiniz.
        </p>
      </section>

      <section id="gp-guvenlik">
        <h2>6. Güvenlik kayıtları</h2>
        <p>
          Hesabınızı ve diğer kullanıcıları korumak için şunlar işlenir: son giriş zamanı, oturum ve güvenlik
          çerezleri, istek sınırlaması için IP adresi, yeni hesap açılışlarında çoklu hesapla kötüye kullanımı
          önlemek amacıyla IP adresi, cihaz parmak izi ve cihaz çerezinin geri döndürülemez özetleri, şikâyetler ve
          yönetici işlem kayıtları. Barındırma sağlayıcımız sitenin çalışması için standart sunucu erişim kayıtları
          tutar.
          {s.recaptcha
            ? " Üye olma formunda otomatik kayıtları engellemek için Google reCAPTCHA kullanılır; reCAPTCHA yalnızca bu formda yüklenir."
            : ""}
        </p>
      </section>

      <section id="gp-cerez">
        <h2>7. Çerezler ve tarayıcı depolama</h2>
        <p>
          Zorunlu çerezler dışında hiçbir çerez veya depolama kaydı izniniz olmadan kullanılmaz. Şu anda analitik veya
          pazarlama amaçlı hiçbir araç kullanılmamaktadır. Tam liste için{" "}
          <Link href="/cerez-aydinlatma" className="font-semibold text-lime">
            Çerez Politikası
          </Link>
          ’na bakınız. Tercihleriniz: <CookiePrefsLink />
        </p>
      </section>

      <section id="gp-ucuncu">
        <h2>8. Üçüncü taraf hizmetler</h2>
        <p>Sitenin çalışması için aşağıdaki hizmet sağlayıcılar kullanılmaktadır:</p>
        <ProcessorTable />
        <p>
          Ayrıca ilan konum haritası (OpenStreetMap, Google Haritalar; yalnızca izninizle veya düğmeye bastığınızda),
          kategori görselleri (Unsplash) ve Google profil fotoğrafları doğrudan ilgili sağlayıcının sunucusundan
          yüklenir. İlan konumunun koordinatlara çevrilmesi ve yakın çevre bilgisi için sunucumuz OpenStreetMap
          Nominatim ve Overpass hizmetlerine yalnızca il/ilçe/mahalle ve koordinat bilgisi gönderir; bu isteklerde sizin
          kişisel bilginiz gönderilmez.
        </p>
      </section>

      <section id="gp-satis">
        <h2>9. Verilerinizi satmıyoruz</h2>
        <p>
          Kişisel verileriniz satılmaz, kiralanmaz, reklam ağlarıyla paylaşılmaz ve size hedefli reklam göstermek
          için kullanılmaz. Pazarlama e-postası almak isteğe bağlıdır; şu anda pazarlama amaçlı ileti
          gönderilmemektedir.
        </p>
      </section>

      <section id="gp-silme">
        <h2>10. Verilerinizin silinmesi</h2>
        <p>
          Hesabınızı giriş yaptıktan sonra{" "}
          <Link href="/profil?p=iptal" className="font-semibold text-lime">
            Hesap ve Verilerim
          </Link>{" "}
          ekranından kendiniz silebilirsiniz. Silme işleminde ilanlarınız yayından kaldırılır ve fotoğrafları
          silinir; profil bilgileriniz, favorileriniz, kayıtlı aramalarınız ve değerlendirmeleriniz silinir;
          gönderdiğiniz mesajların içeriği silinir; e-posta adresiniz ve kullanıcı adınız anonimleştirilir.
          Şikâyet ve yönetici işlem kayıtları, kötüye kullanımla mücadele için adınız ve e-postanız olmadan saklanır.
          Silme dışındaki talepleriniz (erişim, düzeltme, kopya) için aşağıdaki adrese yazabilirsiniz.
        </p>
      </section>

      <section id="gp-iletisim">
        <h2>11. İletişim</h2>
        <p>
          Gizlilikle ilgili tüm sorularınız ve KVKK başvurularınız için: <Mail to={LEGAL_PRIVACY_EMAIL} />. Bu
          politika değiştiğinde güncelleme tarihi bu sayfada yenilenir; önemli değişiklikler sitede ayrıca duyurulur.
        </p>
      </section>
    </div>
  );
}
