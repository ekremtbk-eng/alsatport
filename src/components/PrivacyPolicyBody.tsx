import Link from "next/link";
import {
  LEGAL_ADDRESS,
  LEGAL_BRAND,
  LEGAL_COMPANY,
  LEGAL_EMAIL_DESTEK,
  LEGAL_KEP,
  LEGAL_PHONE,
  LEGAL_WEB,
} from "@/data/legal";

const UPDATED = "30 Eylül 2026";

function Mail({ to }: { to: string }) {
  return (
    <a className="font-semibold text-lime hover:underline" href={`mailto:${to}`}>
      {to}
    </a>
  );
}

export function PrivacyPolicyBody() {
  return (
    <div className="legal-prose text-sm leading-relaxed">
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">Privacy Policy · Gizlilik Politikası</p>
      <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">Gizlilik Politikası</h1>
      <p className="mt-2 text-muted">Yürürlük / son güncelleme: {UPDATED}</p>
      <p className="mt-1 text-muted">
        Bu politika {LEGAL_WEB} üretim ortamında yayımlanır ve Google OAuth 2.0 (OpenID Connect)
        ile giriş dâhil tüm AlsatPort hesap işlemleri için geçerlidir.
      </p>

      <aside className="mt-5 rounded-xl border border-lime/30 bg-lime/10 p-4 text-sm text-ink">
        <p className="font-extrabold">Google Sign-In — what we collect</p>
        <p className="mt-2">
          When you sign in with Google, AlsatPort receives only your <strong>name</strong>,{" "}
          <strong>email address</strong> and <strong>profile picture</strong> (plus a Google account
          ID to recognise you on later visits). We use this solely to create and operate your
          AlsatPort account. We do <strong>not</strong> sell, rent or share this Google user data
          with third parties for advertising or other unrelated purposes. Contact:{" "}
          <Mail to={LEGAL_EMAIL_DESTEK} />
        </p>
      </aside>

      <nav className="mt-5 flex flex-wrap gap-2 text-xs">
        {[
          ["#veri-sorumlusu", "1. Veri sorumlusu"],
          ["#toplanan", "2. Toplanan veriler"],
          ["#google", "3. Google ile giriş"],
          ["#amac", "4. Kullanım amacı"],
          ["#paylasim", "5. Üçüncü kişiler"],
          ["#cerez", "6. Çerezler"],
          ["#iletisim", "7. İletişim"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="chip">
            {label}
          </a>
        ))}
      </nav>

      <section id="veri-sorumlusu" className="mt-8 scroll-mt-24">
        <h2>1. Veri sorumlusu</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca kişisel verilerinizin
          veri sorumlusu aşağıdaki tüzel kişidir:
        </p>
        <ul>
          <li>
            <strong>Unvan:</strong> {LEGAL_COMPANY} (“AlsatPort”, “Şirket”, “biz”)
          </li>
          <li>
            <strong>Marka / platform:</strong> {LEGAL_BRAND} — {LEGAL_WEB}
          </li>
          <li>
            <strong>Adres:</strong> {LEGAL_ADDRESS}
          </li>
          <li>
            <strong>Telefon:</strong> {LEGAL_PHONE}
          </li>
          <li>
            <strong>KEP:</strong> {LEGAL_KEP}
          </li>
          <li>
            <strong>Gizlilik, Google OAuth ve kullanıcı verileri için tek iletişim:</strong>{" "}
            <Mail to={LEGAL_EMAIL_DESTEK} />
          </li>
        </ul>
        <p>
          Tüm gizlilik talepleri, Google kullanıcı verilerinizin silinmesi veya düzeltilmesi ve
          OAuth izinleriyle ilgili sorular <Mail to={LEGAL_EMAIL_DESTEK} /> adresine yöneltilir.
        </p>
      </section>

      <section id="toplanan" className="mt-8 scroll-mt-24">
        <h2>2. Toplanan kişisel veriler</h2>
        <p>AlsatPort aşağıdaki kategorilerde kişisel veri işleyebilir:</p>
        <ul>
          <li>
            <strong>Google ile girişte:</strong> ad (profil adı), e-posta adresi, profil resmi,
            Google hesap kimliği (sub).
          </li>
          <li>
            <strong>E-posta/şifre kaydında:</strong> e-posta, kullanıcı adı, şifre özeti (düz metin
            şifre saklanmaz).
          </li>
          <li>
            <strong>Profil tamamlama (ilan vermek için):</strong> ad soyad, telefon, doğum tarihi,
            T.C. kimlik veya vergi no, açık adres.
          </li>
          <li>
            <strong>Hizmet kullanımı:</strong> ilanlar, mesajlar, favoriler, kayıtlı aramalar,
            yüklenen fotoğraflar, bildirim tercihleri.
          </li>
          <li>
            <strong>Teknik:</strong> IP adresi, tarayıcı/cihaz bilgisi, oturum ve güvenlik
            çerezleri.
          </li>
        </ul>
      </section>

      <section id="google" className="mt-8 scroll-mt-24">
        <h2>3. Google OAuth 2.0 ile giriş — ad, e-posta, profil resmi</h2>
        <p>
          Kullanıcı “Google ile devam et” düğmesine bastığında Google’ın OAuth 2.0 / OpenID
          Connect akışı çalışır. AlsatPort’un talep ettiği kapsamlar (scopes) yalnızca{" "}
          <code>openid</code>, <code>email</code> ve <code>profile</code> ile sınırlıdır.
        </p>
        <p>
          <strong>Google’dan alınan kişisel veriler açıkça şunlardır ve başka Google verisi
          alınmaz:</strong>
        </p>
        <ul>
          <li>
            <strong>Ad (name / display name):</strong> AlsatPort üyelik profilinde ve ilanlarda
            görünen ad olarak kullanılır.
          </li>
          <li>
            <strong>E-posta adresi:</strong> hesabın benzersiz kimliği, oturum açma, e-posta
            doğrulama ve güvenlik/destek iletileri ({LEGAL_EMAIL_DESTEK} altyapısı) için
            kullanılır. Gmail kutunuz, taslaklarınız veya diğer postalarınıza erişilmez.
          </li>
          <li>
            <strong>Profil resmi (picture):</strong> varsayılan profil fotoğrafı olarak gösterilir.
            Kullanıcı dilerse AlsatPort galeri/kamera yüklemesi ile değiştirebilir. Google
            Fotoğraflar albümüne erişilmez.
          </li>
        </ul>
        <p>
          Google Drive, Gmail, Rehber, Takvim, konum geçmişi veya ödeme bilgisi talep edilmez ve
          işlenmez. Google kullanıcı verileri yapay zekâ/model eğitiminde, bağımsız insan
          incelemesinde (hesap güvenliği veya yasal zorunluluk dışında) veya Google API Services
          User Data Policy — Limited Use kurallarının izin vermediği başka amaçlarla
          kullanılmaz.
        </p>
      </section>

      <section id="amac" className="mt-8 scroll-mt-24">
        <h2>4. Verilerin kullanım amacı</h2>
        <p>Toplanan veriler yalnızca aşağıdaki meşru amaçlarla işlenir:</p>
        <ul>
          <li>AlsatPort hesabını oluşturmak, oturum açmak ve hesabı sizinle eşleştirmek</li>
          <li>İlan yayımlama, arama, mesajlaşma ve profil görüntülemesi</li>
          <li>Hesap güvenliği, sahtecilik önleme, KVKK ve e-ticaret yükümlülükleri</li>
          <li>
            Destek ve doğrulama e-postaları göndermek (gönderen: {LEGAL_EMAIL_DESTEK})
          </li>
          <li>Kanunların zorunlu kıldığı hallerde yetkili mercilere bilgi vermek</li>
        </ul>
        <p>
          Google’dan gelen ad, e-posta ve profil resmi <strong>yalnızca AlsatPort hesabınızın
          işletilmesi</strong> için kullanılır; reklam hedefleme, üçüncü taraf pazarlama veya
          unrelated ürün geliştirme için kullanılmaz.
        </p>
      </section>

      <section id="paylasim" className="mt-8 scroll-mt-24">
        <h2>5. Üçüncü taraflarla paylaşılmama</h2>
        <p>
          <strong>
            Google ile girişte alınan ad, e-posta adresi ve profil resmi üçüncü taraflara
            satılmaz, kiralanmaz, takas edilmez veya reklam / veri broker amaçlı paylaşılmaz.
          </strong>
        </p>
        <p>
          Bu veriler başka mobil uygulamalara, sosyal ağlara veya analitik reklam platformlarına
          aktarılmaz. Yalnızca AlsatPort hizmetinin barındırılması için teknik alt işlemciler
          (uygulama barındırma, veritabanı, e-posta iletimi) kullanılır; bunlar veriyi kendi
          pazarlama amaçlarıyla kullanamaz. Ödeme altyapısı (PayTR) yalnızca sizin başlattığınız
          ücretli işlemde devreye girer ve Google profil verisini almaz.
        </p>
        <p>
          Zorunlu istisna: yürürlükteki hukuk, mahkeme veya yetkili kamu kurumu kararı. Google,
          kimlik doğrulamayı sizin onay verdiğiniz OAuth ekranı üzerinden sağlar; AlsatPort
          Google’dan aldığını veriyi Google’a geri “satmaz”.
        </p>
      </section>

      <section id="cerez" className="mt-8 scroll-mt-24">
        <h2>6. Çerezler</h2>
        <p>
          AlsatPort, oturumun sürdürülmesi, CSRF koruması ve güvenlik için zorunlu çerezler
          kullanır. Bu çerezler Google kullanıcı verilerinizi reklam ağına aktarmak için
          kullanılmaz. Tercih yönetimi sitedeki “Çerez ayarları” üzerinden yapılır. Ayrıntılı
          çerez ve KVKK aydınlatması:{" "}
          <Link href="/cerez-aydinlatma" className="font-semibold text-lime hover:underline">
            KVKK / Çerez Aydınlatma Metni
          </Link>
          .
        </p>
      </section>

      <section className="mt-8 scroll-mt-24">
        <h2>7. Saklama, güvenlik ve silme</h2>
        <p>
          Ad, e-posta ve profil resmi HTTPS ile iletilir ve hesap kaydınızda saklanır. Üyelik
          sona erdiğinde veya <Mail to={LEGAL_EMAIL_DESTEK} /> üzerinden silme talebinizde, yasal
          saklama yükümlülükleri saklı kalmak kaydıyla silinir veya anonimleştirilir. Google
          hesabınızdaki AlsatPort erişimini Google hesap izinlerinden de iptal edebilirsiniz.
        </p>
      </section>

      <section id="iletisim" className="mt-8 scroll-mt-24">
        <h2>8. İletişim</h2>
        <p>
          Gizlilik politikası, Google OAuth verileri ve KVKK talepleri için iletişim adresi:
        </p>
        <p className="text-base font-extrabold">
          <Mail to={LEGAL_EMAIL_DESTEK} />
        </p>
        <p>
          {LEGAL_COMPANY} — {LEGAL_ADDRESS}
        </p>
        <p>
          Kullanım koşulları:{" "}
          <Link href="/kullanim-kosullari" className="font-semibold text-lime hover:underline">
            /kullanim-kosullari
          </Link>
        </p>
      </section>
    </div>
  );
}
