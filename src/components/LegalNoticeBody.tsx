import Link from "next/link";
import { LEGAL_ADDRESS, LEGAL_BRAND, LEGAL_PRIVACY_EMAIL } from "@/data/legal";
import { LEGAL_SERVICES } from "@/lib/legalServices";
import { ControllerIdentity, LegalHeader, LegalToc, Mail, ProcessorTable } from "@/components/legal/LegalUi";

type Activity = { activity: string; data: string; purpose: string; basis: string; method: string };

function activities(): Activity[] {
  const s = LEGAL_SERVICES;
  const rows: Activity[] = [
    {
      activity: "Üyelik ve giriş",
      data: `E-posta, ad-soyad, kullanıcı adı, şifrenin geri döndürülemez özeti (bcrypt)${
        s.google ? ", Google ile girişte Google hesap kimliği, ad-soyad, e-posta ve profil fotoğrafı bağlantısı" : ""
      }, son giriş zamanı`,
      purpose: "Hesap açmak, kimliğinizi doğrulayarak giriş yapmanızı sağlamak, e-posta adresinizi doğrulamak",
      basis: "KVKK m.5/2(c) – sözleşmenin kurulması ve ifası",
      method: `Kayıt ve giriş formları${s.google ? ", Google ile giriş" : ""} (elektronik)`,
    },
    {
      activity: "Profil ve ilan verme ön koşulları",
      data: "Telefon numarası, açık adres (sunucuda şifreli saklanır), şehir, profil fotoğrafı (isteğe bağlı), doğrulanmış işletme adı (yalnızca yönetici onayıyla)",
      purpose: "İlan verebilmeniz için profilinizin tamamlanması, alıcıların sizinle iletişim kurabilmesi, sahte hesapların azaltılması",
      basis: "KVKK m.5/2(c) – sözleşmenin ifası; m.5/2(f) – meşru menfaat (dolandırıcılığın önlenmesi)",
      method: "Profil bilgileri formu (elektronik)",
    },
    {
      activity: "İlan yayınlama",
      data: "İlan başlığı, açıklaması, fiyatı, kategorisi, özellikleri, fotoğrafları, il/ilçe/mahalle ve bu bilgilerden hesaplanan yaklaşık harita konumu; ilanda görünen satıcı adı (ad ve soyadın baş harfi ya da onaylı işletme adı) ve giriş yapmış üyelere gösterilen telefon numarası",
      purpose: "İlanınızın yayınlanması, aranabilir olması ve alıcıların sizinle iletişim kurması",
      basis: "KVKK m.5/2(c) – sözleşmenin ifası; yayımladığınız ilan içeriği için m.5/2(d) – ilgili kişinin kendisi tarafından alenileştirilme",
      method: "İlan verme formu (elektronik)",
    },
    {
      activity: "Mesajlaşma",
      data: "Mesaj içeriği, gönderim ve okunma zamanı (okundu bilgisi ayarınız açıksa karşı tarafa gösterilir)",
      purpose: "Alıcı ve satıcıların platform üzerinden iletişim kurması",
      basis: "KVKK m.5/2(c) – sözleşmenin ifası",
      method: "Mesaj ekranı (elektronik)",
    },
    {
      activity: "Favoriler, kayıtlı aramalar, değerlendirmeler, engellemeler",
      data: "Favori ilanlar, kayıtlı arama kriterleri, satıcı değerlendirmeleriniz (puan ve yorum), engellediğiniz kullanıcılar",
      purpose: "Hesabınıza bağlı kişisel tercih ve listelerin tutulması, satıcı güven puanının gösterilmesi",
      basis: "KVKK m.5/2(c) – sözleşmenin ifası",
      method: "İlgili ekranlar (elektronik)",
    },
    {
      activity: "Hesap güvenliği",
      data: "Tek kullanımlık doğrulama kodlarının özeti, iki adımlı doğrulama ayarı, kurtarma e-postası, güvenilen cihaz çerezi, QR ile girişte tarayıcı bilgisi; ücretsiz ilan hakkının çoklu hesapla kötüye kullanımını önlemek için IP adresi, cihaz parmak izi ve cihaz çerezinin geri döndürülemez özetleri",
      purpose: "Yetkisiz girişleri ve hesap ele geçirmeyi önlemek, kötüye kullanımı tespit etmek, istek sınırlaması uygulamak",
      basis: "KVKK m.5/2(f) – meşru menfaat (platform ve kullanıcı güvenliği)",
      method: "Giriş, kayıt ve doğrulama işlemleri sırasında otomatik olarak",
    },
    {
      activity: "Şikâyet ve içerik denetimi",
      data: "Şikâyet nedeni ve açıklaması, şikâyet eden ve şikâyet edilen hesap, şikâyet edilen ilan, yönetici işlem kayıtları",
      purpose: "Kurallara aykırı ilanların incelenmesi ve kaldırılması, gerektiğinde hesapların sınırlandırılması",
      basis: "KVKK m.5/2(f) – meşru menfaat; m.5/2(e) – bir hakkın tesisi, kullanılması veya korunması",
      method: "Şikâyet formu ve yönetim paneli (elektronik)",
    },
    {
      activity: "Hizmet e-postaları",
      data: "E-posta adresi, ad, e-posta içeriği (doğrulama kodu, şifre sıfırlama bağlantısı, güvenlik bildirimi, hoş geldiniz e-postası)",
      purpose: "Hesap ve güvenlik işlemlerine ilişkin zorunlu bilgilendirme",
      basis: "KVKK m.5/2(c) – sözleşmenin ifası; güvenlik bildirimleri için m.5/2(f)",
      method: "Otomatik (elektronik)",
    },
    {
      activity: "Teknik kayıtlar",
      data: "IP adresi, tarayıcı/cihaz bilgisi, istek zamanı ve adresi (barındırma sağlayıcısının sunucu kayıtları)",
      purpose: "Sitenin çalıştırılması, hata ve saldırıların tespiti",
      basis: "KVKK m.5/2(f) – meşru menfaat; m.5/2(ç) – hukuki yükümlülük (5651 sayılı Kanun kapsamındaki yükümlülükler)",
      method: "Siteyi ziyaret ettiğinizde otomatik olarak",
    },
  ];
  if (s.recaptcha) {
    rows.push({
      activity: "Bot koruması",
      data: "Google reCAPTCHA tarafından toplanan IP adresi, tarayıcı ve etkileşim bilgileri",
      purpose: "Üye olma formunun otomatik programlarla kötüye kullanılmasını önlemek",
      basis: "KVKK m.5/2(f) – meşru menfaat",
      method: "Yalnızca üye olma formu açıldığında yüklenen Google reCAPTCHA betiği",
    });
  }
  return rows;
}

export function LegalNoticeBody({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`legal-prose leading-relaxed ${compact ? "text-[13px]" : "text-sm"}`}>
      <LegalHeader kicker="Kişisel verilerin korunması" title="KVKK Aydınlatma Metni" compact={compact} />

      <p className="mt-4">
        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu’nun (“KVKK”) 10. maddesi uyarınca, {LEGAL_BRAND}{" "}
        sitesini ziyaret eden ve kullanan kişilere, kişisel verilerinin hangi amaçla, hangi hukuki sebeple ve nasıl
        işlendiğini bildirmek için hazırlanmıştır. Bu bir sözleşme veya onay metni değildir; okumanız için
        hazırlanmıştır ve hizmeti kullanmak için ayrıca “kabul” etmeniz gerekmez.
      </p>

      <LegalToc
        items={[
          ["#kvkk-sorumlu", "Veri sorumlusu"],
          ["#kvkk-faaliyet", "Veriler, amaçlar ve hukuki sebepler"],
          ["#kvkk-aktarim", "Aktarım"],
          ["#kvkk-yurtdisi", "Yurt dışına aktarım"],
          ["#kvkk-saklama", "Saklama süreleri"],
          ["#kvkk-haklar", "Haklarınız"],
          ["#kvkk-basvuru", "Başvuru"],
        ]}
      />

      <section id="kvkk-sorumlu" className="mt-6">
        <h2>1. Veri sorumlusu</h2>
        <ControllerIdentity />
      </section>

      <section id="kvkk-faaliyet">
        <h2>2. İşlenen veriler, amaçlar, hukuki sebepler ve toplama yöntemi</h2>
        <p>
          Yalnızca aşağıdaki tabloda yazan veriler işlenir. T.C. kimlik numarası, kimlik belgesi, banka veya kart
          bilgisi, sağlık verisi ya da başka bir özel nitelikli kişisel veri istenmez ve işlenmez.
        </p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Faaliyet</th>
                <th>İşlenen veriler</th>
                <th>Amaç</th>
                <th>Hukuki sebep</th>
                <th>Toplama yöntemi</th>
              </tr>
            </thead>
            <tbody>
              {activities().map((a) => (
                <tr key={a.activity}>
                  <td>
                    <strong>{a.activity}</strong>
                  </td>
                  <td>{a.data}</td>
                  <td>{a.purpose}</td>
                  <td>{a.basis}</td>
                  <td>{a.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Konum izni verirseniz tarayıcınızın bildirdiği konum yalnızca cihazınızda size en yakın ili bulmak için
          kullanılır; sunucularımıza gönderilmez. Pazarlama e-postası tercihi kayıt sırasında isteğe bağlıdır ve
          profilinizden her zaman değiştirilebilir; şu anda pazarlama amaçlı ileti gönderilmemektedir.
        </p>
        <p>
          Çerezler ve tarayıcı depolama alanı hakkında ayrıntılar için{" "}
          <Link href="/cerez-aydinlatma" className="font-semibold text-lime">
            Çerez Politikası
          </Link>
          ’na bakınız.
        </p>
      </section>

      <section id="kvkk-aktarim">
        <h2>3. Kişisel verilerin aktarılması</h2>
        <p>
          Kişisel verileriniz satılmaz, kiralanmaz ve reklam amacıyla kimseyle paylaşılmaz. Veriler yalnızca
          aşağıdaki durumlarda aktarılır:
        </p>
        <ul>
          <li>
            <strong>Hizmet sağlayıcılarımıza (veri işleyenler):</strong> sitenin çalışması için gerekli altyapı
            hizmetleri, KVKK m.8 ve m.5/2(c), (f) kapsamında. Bu sürümde etkin olanlar aşağıdaki tabloda
            listelenmiştir.
          </li>
          <li>
            <strong>Diğer kullanıcılara:</strong> yayımladığınız ilan içeriği herkese, telefon numaranız ise yalnızca
            giriş yapmış üyelere gösterilir; mesajlarınız yalnızca yazıştığınız kişiye iletilir.
          </li>
          <li>
            <strong>Yetkili kamu kurum ve kuruluşlarına:</strong> yalnızca yasal bir talep veya yükümlülük
            bulunduğunda, KVKK m.8/2(a) ve m.5/2(ç) kapsamında.
          </li>
        </ul>
        <ProcessorTable />
        <p>
          Haritalar ve kategori görselleri gibi bazı içerikler doğrudan üçüncü taraf sunuculardan (OpenStreetMap,
          Google Haritalar, Unsplash, Google profil fotoğrafları) yüklenir; bu durumda tarayıcınız IP adresinizi ilgili
          sunucuya iletir. Harita gömmeleri yalnızca işlevsel çerezlere izin verdiğinizde veya “haritayı yükle”
          düğmesine bastığınızda yüklenir.
        </p>
      </section>

      <section id="kvkk-yurtdisi">
        <h2>4. Yurt dışına aktarım</h2>
        <p>
          Yukarıdaki tabloda yer alan hizmet sağlayıcıların bir kısmının sunucuları veya şirket merkezleri Türkiye
          dışındadır (ABD ve Avrupa Birliği). Bu nedenle kişisel verileriniz, ilgili hizmetin sunulması amacıyla bu
          ülkelere aktarılmaktadır. Bu aktarımlar KVKK m.9 kapsamındadır; aktarımda dayanılan güvenceler hakkında
          bilgi almak için aşağıdaki başvuru kanalını kullanabilirsiniz.
        </p>
      </section>

      <section id="kvkk-saklama">
        <h2>5. Saklama süreleri</h2>
        <ul>
          <li>
            <strong>Hesap ve profil verileri, favoriler, kayıtlı aramalar, değerlendirmeler:</strong> hesabınız açık
            olduğu sürece. “Hesap ve Verilerim” ekranından hesabınızı sildiğinizde derhâl silinir veya anonim hâle
            getirilir.
          </li>
          <li>
            <strong>İlanlar:</strong> yayından kaldırdığınız ilanlar herkese kapanır; kayıt, olası şikâyet ve
            uyuşmazlıkların incelenebilmesi için hesabınız açık olduğu sürece “silinmiş” olarak tutulur. Hesabınızı
            sildiğinizde ilanlarınızın fotoğrafları depolamadan silinir.
          </li>
          <li>
            <strong>Mesajlar:</strong> hesabınız açık olduğu sürece; hesabınızı sildiğinizde gönderdiğiniz mesajların
            içeriği silinir.
          </li>
          <li>
            <strong>Doğrulama kodları ve QR giriş anahtarları:</strong> yalnızca özet (hash) olarak tutulur ve
            dakikalar içinde geçersiz olur; süresi dolan QR anahtarları otomatik silinir.
          </li>
          <li>
            <strong>Oturum ve güvenlik çerezleri:</strong> Çerez Politikası’nda her biri için yazılı süre kadar.
          </li>
          <li>
            <strong>Şikâyet ve yönetici işlem kayıtları:</strong> kötüye kullanımla mücadele ve olası hukuki
            taleplere karşı savunma için ilgili zamanaşımı süreleri boyunca; hesabınız silinmişse ad ve e-posta
            olmadan, yalnızca anonim kullanıcı kimliğiyle.
          </li>
          <li>
            <strong>Sunucu erişim kayıtları:</strong> barındırma sağlayıcısının kayıt saklama süresi ve yasal
            yükümlülüklerin gerektirdiği süre kadar.
          </li>
        </ul>
        <p>
          Süresi dolan veriler, Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında
          Yönetmelik’e uygun şekilde silinir veya anonim hâle getirilir.
        </p>
      </section>

      <section id="kvkk-haklar">
        <h2>6. KVKK m.11 kapsamındaki haklarınız</h2>
        <p>Veri sorumlusuna başvurarak;</p>
        <ol type="a">
          <li>kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
          <li>işlenmişse buna ilişkin bilgi talep etme,</li>
          <li>işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
          <li>yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
          <li>eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
          <li>KVKK m.7’deki şartlar çerçevesinde silinmesini veya yok edilmesini isteme,</li>
          <li>(e) ve (f) bentleri uyarınca yapılan işlemlerin, verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
          <li>
            işlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir
            sonucun ortaya çıkmasına itiraz etme,
          </li>
          <li>kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
        </ol>
        <p>haklarına sahipsiniz.</p>
      </section>

      <section id="kvkk-basvuru">
        <h2>7. Başvuru yöntemi</h2>
        <p>
          Başvurunuzu, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ uyarınca, {LEGAL_BRAND}’ta kayıtlı
          e-posta adresinizden <Mail to={LEGAL_PRIVACY_EMAIL} /> adresine
          {LEGAL_ADDRESS ? (
            <>
              {" "}
              veya ıslak imzalı dilekçeyle <strong>{LEGAL_ADDRESS}</strong> adresine
            </>
          ) : null}{" "}
          iletebilirsiniz. Başvuruda adınızı, soyadınızı, hesabınıza kayıtlı e-posta adresinizi ve talebinizi açıkça
          belirtiniz. Kimliğinizi doğrulamak için hesabınıza kayıtlı e-postayla yazışma yapılabilir.
        </p>
        <p>
          Başvurunuz en geç 30 gün içinde ücretsiz olarak sonuçlandırılır. İşlemin ayrıca bir maliyet gerektirmesi
          hâlinde Kişisel Verileri Koruma Kurulu’nun belirlediği tarife uygulanabilir. Başvurunuzun reddedilmesi,
          cevabı yetersiz bulmanız veya süresinde cevap verilmemesi hâlinde KVKK m.14 uyarınca Kişisel Verileri Koruma
          Kurulu’na şikâyette bulunabilirsiniz.
        </p>
        <p>
          Hesabınızı ve verilerinizi silmek için başvuru yapmanıza gerek yoktur; giriş yaptıktan sonra{" "}
          <Link href="/profil?p=iptal" className="font-semibold text-lime">
            Hesap ve Verilerim
          </Link>{" "}
          ekranını kullanabilirsiniz.
        </p>
      </section>
    </div>
  );
}
