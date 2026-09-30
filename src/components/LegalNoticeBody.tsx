import Link from "next/link";
import { CookiePrefsLink } from "@/components/CookiePrefsLink";
import {
  LEGAL_BRAND,
  LEGAL_EMAIL_DESTEK,
  LEGAL_EMAIL_KVKK,
  LEGAL_KEP,
  LEGAL_UPDATED,
  LEGAL_WEB,
} from "@/data/legal";

function Mail({ to }: { to: string }) {
  return (
    <a className="font-semibold text-lime hover:underline" href={`mailto:${to}`}>
      {to}
    </a>
  );
}

export function LegalNoticeBody({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`legal-prose leading-relaxed ${compact ? "text-[13px]" : "text-sm"}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">Yasal bildirim</p>
      <h1 className={`mt-1 font-extrabold ${compact ? "text-xl" : "text-2xl md:text-3xl"}`}>
        KVKK / Çerez Aydınlatma Metni
      </h1>
      <p className="mt-2 text-muted">Son güncelleme: {LEGAL_UPDATED}</p>
      <p className="mt-1 text-muted">
        Veri sorumlusu: <strong className="text-soft">{LEGAL_BRAND}</strong> (“Şirket”, “Platform”)
      </p>

      <p className="mt-5 text-soft">
        İşbu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“<strong>KVKK</strong>”),
        Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik,
        Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ, Kişisel Verileri Koruma Kurulu
        karar ve ilkeleri ile 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun, 5651
        sayılı İnternet Ortamında Yapılan Yayınların Düzenlenmesi ve Bu Yayınlar Yoluyla İşlenen
        Suçlarla Mücadele Edilmesi Hakkında Kanun ve ilgili ikincil mevzuat uyarınca;{" "}
        {LEGAL_BRAND} platformunu ziyaret eden, üye olan, ilan veren, ilan inceleyen, mesajlaşan,
        paket satın alan veya başka surette hizmetlerimizden yararlanan gerçek kişileri
        (“ilgili kişi”, “kullanıcı”, “siz”) kişisel verilerinin işlenmesi, aktarılması, saklanması
        ve çerezler yoluyla toplanması hakkında <strong>aydınlatmak</strong> amacıyla
        hazırlanmıştır. KVKK m.10 kapsamındaki aydınlatma yükümlülüğü işbu metinle yerine
        getirilir. Hiçbir madde, hak veya hukuki sebep atlanmamıştır.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2 text-xs">
        {[
          ["#veri-sorumlusu", "Veri sorumlusu"],
          ["#veri-kategorileri", "Veri kategorileri"],
          ["#amac", "Amaçlar"],
          ["#hukuki-sebepler", "Hukuki sebepler"],
          ["#aktarim", "Aktarım"],
          ["#cerezler", "Çerezler"],
          ["#haklar", "KVKK m.11 hakları"],
          ["#basvuru", "Başvuru"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="chip">
            {label}
          </a>
        ))}
        <CookiePrefsLink />
      </nav>

      <section id="veri-sorumlusu" className="mt-8 scroll-mt-24">
        <h2>1. Veri sorumlusunun kimliği ve iletişim bilgileri</h2>
        <p>
          Kişisel verileriniz, KVKK m.3/1(ı) ve m.10 uyarınca veri sorumlusu sıfatıyla aşağıdaki
          tüzel kişi tarafından işlenmektedir:
        </p>
        <ul>
          <li>
            <strong>Ticari marka / platform:</strong> {LEGAL_BRAND}
          </li>
          <li>
            <strong>KVKK başvuruları:</strong> <Mail to={LEGAL_EMAIL_KVKK} />
          </li>
          <li>
            <strong>Müşteri destek:</strong> <Mail to={LEGAL_EMAIL_DESTEK} />
          </li>
          <li>
            <strong>KEP:</strong> {LEGAL_KEP}
          </li>
          <li>
            <strong>İnternet sitesi:</strong>{" "}
            <a className="text-lime hover:underline" href={LEGAL_WEB} target="_blank" rel="noreferrer">
              {LEGAL_WEB}
            </a>
          </li>
        </ul>
        <p>
          {LEGAL_BRAND}; ilan yayını, arama, mesajlaşma, üyelik, doğrulama, vitrin/VIP paketleri ve
          ilgili destek hizmetlerini sunan bir çevrimiçi pazaryeridir. Şirket, kişisel verileri
          KVKK’daki ilkelere (hukuka ve dürüstlük kurallarına uygunluk, doğru ve güncel olma,
          belirli, açık ve meşru amaçlar için işleme, işlendikleri amaçla bağlantılı, sınırlı ve
          ölçülü olma, ilgili mevzuatta öngörülen veya işlendikleri amaç için gerekli süre kadar
          muhafaza edilme) uygun olarak işler.
        </p>
      </section>

      <section id="veri-kategorileri" className="mt-8 scroll-mt-24">
        <h2>2. İşlenen kişisel veri kategorileri</h2>
        <p>
          Hizmetin niteliğine, üyelik türüne ve sizin sağladığınız içeriklere göre aşağıdakiler
          işlenebilir. Zorunlu olmayan veriler talep edilmez; özel nitelikli kişisel veriler kural
          olarak işlenmez, işlenmesi gerekirse KVKK m.6 şartlarına uyulur.
        </p>
        <ul>
          <li>
            <strong>Kimlik:</strong> ad, soyad, T.C. kimlik numarası, doğum tarihi, kullanıcı adı,
            üyelik numarası
          </li>
          <li>
            <strong>İletişim:</strong> telefon, e-posta, il/ilçe, adres, KEP
          </li>
          <li>
            <strong>Müşteri işlem:</strong> ilan başlığı/açıklaması, fiyat, kategori, fotoğraf,
            sipariş/paket, fatura bilgisi
          </li>
          <li>
            <strong>Görsel ve işitsel kayıtlar:</strong> profil ve ilan görselleri
          </li>
          <li>
            <strong>İşlem güvenliği:</strong> IP, oturum, cihaz/tarayıcı, çerez kimlikleri, log,
            iki faktörlü doğrulama kayıtları
          </li>
          <li>
            <strong>Lokasyon:</strong> ilan konumu, yaklaşık IP coğrafyası
          </li>
          <li>
            <strong>Pazarlama:</strong> kampanya tercihleri, açık rıza kayıtları, çerez onayları
          </li>
          <li>
            <strong>Hukuki işlem ve uyum:</strong> şikâyet, ihtar, savcılık/mahkeme yazışmaları
          </li>
          <li>
            <strong>Finansal:</strong> fatura unvanı, vergi dairesi/no, ödeme sağlayıcısı referansı
            (kart verisi kural olarak ödeme kuruluşunda tutulur)
          </li>
        </ul>
      </section>

      <section id="amac" className="mt-8 scroll-mt-24">
        <h2>3. Kişisel verilerin işlenme amaçları</h2>
        <p>Verileriniz KVKK m.4 ilkeleri çerçevesinde aşağıdaki amaçlarla işlenir:</p>
        <ul>
          <li>Üyelik sözleşmesinin kurulması, ifası ve sona erdirilmesi</li>
          <li>Hesap oluşturma, giriş, kimlik ve iletişim doğrulama, hesap tamamlama</li>
          <li>İlanların yayımlanması, aranması, filtrelenmesi, vitrin/VIP sıralaması</li>
          <li>Alıcı–satıcı mesajlaşması, bildirim ve müşteri desteği</li>
          <li>Dolandırıcılık, sahte hesap, kötüye kullanım ve güvenlik tehditlerinin önlenmesi</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi (elektronik ticaret, vergi, 5651 logları)</li>
          <li>Uyuşmazlıkların çözümü, bir hakkın tesisi, kullanılması veya korunması</li>
          <li>Paket, faturalama ve tahsilat süreçlerinin yürütülmesi</li>
          <li>İstatistik, hizmet geliştirme ve (rıza varsa) analiz</li>
          <li>Açık rızanız varsa ticari elektronik ileti ve kişiselleştirilmiş kampanya</li>
          <li>Çerez tercihlerinizin kaydı ve yönetilmesi</li>
        </ul>
      </section>

      <section id="hukuki-sebepler" className="mt-8 scroll-mt-24">
        <h2>4. Toplama yöntemi ve hukuki sebepler (KVKK m.5 ve m.6)</h2>
        <p>
          Veriler; web/mobil formlar, ilan ve mesaj içerikleri, çağrı merkezi, e-posta, çerezler,
          log kayıtları, ödeme/kimlik sağlayıcıları ve kamuya açık kaynaklardan otomatik veya
          otomatik olmayan yollarla toplanır.
        </p>
        <p>
          <strong>KVKK m.5/2 hukuki sebepleri</strong> (açık rıza aranmayan haller) şunlardır:
        </p>
        <ul>
          <li>
            <strong>m.5/2(a):</strong> kanunlarda açıkça öngörülmesi (vergi, e-ticaret, 5651 sayılı
            Kanun saklama yükümlülükleri vb.)
          </li>
          <li>
            <strong>m.5/2(c):</strong> bir sözleşmenin kurulması veya ifası ile doğrudan ilgili
            olması kaydıyla sözleşmenin taraflarına ait kişisel verilerin işlenmesi (üyelik, ilan,
            mesaj, paket)
          </li>
          <li>
            <strong>m.5/2(ç):</strong> veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi
            için zorunlu olması
          </li>
          <li>
            <strong>m.5/2(d):</strong> ilgili kişinin kendisi tarafından alenileştirilmiş olması
            (yayımladığınız ilan içeriği)
          </li>
          <li>
            <strong>m.5/2(e):</strong> bir hakkın tesisi, kullanılması veya korunması için veri
            işlemenin zorunlu olması
          </li>
          <li>
            <strong>m.5/2(f):</strong> ilgili kişinin temel hak ve özgürlüklerine zarar vermemek
            kaydıyla, veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması
            (güvenlik, sahtecilik önleme, zorunlu çerezler, hizmet sürekliliği)
          </li>
        </ul>
        <p>
          <strong>KVKK m.5/1 açık rıza:</strong> pazarlama iletileri, isteğe bağlı analitik ve
          pazarlama çerezleri ile mevzuatın rıza aradığı diğer işlemler için alınır. Rızanızı
          dilediğiniz zaman geri alabilirsiniz; geri alma, geri alma öncesi hukuka uygun işlemi
          etkilemez.
        </p>
        <p>
          <strong>KVKK m.6 özel nitelikli kişisel veriler:</strong> sağlık, biometrik, din, sendika
          vb. veriler kural olarak işlenmez. İstisnai olarak işlenmesi gerekirse m.6’daki şartlar
          (açık rıza veya kanunda öngörülen haller ve Kurul’un yeterli önlemleri) uygulanır. T.C.
          kimlik numarası kimlik kategorisinde olup hesap güvenliği ve yasal yükümlülük için
          işlenebilir.
        </p>
      </section>

      <section id="aktarim" className="mt-8 scroll-mt-24">
        <h2>5. Aktarım (KVKK m.8 ve m.9)</h2>
        <p>
          Verileriniz, işleme amaçlarıyla sınırlı ve orantılı olarak aşağıdaki alıcı gruplarına
          aktarılabilir:
        </p>
        <ul>
          <li>Yetkili kamu kurum ve kuruluşları (mahkeme, savcılık, kolluk, KVKK Kurulu, vergi)</li>
          <li>Barındırma, CDN, e-posta, SMS, müşteri destek ve güvenlik işleyenleri</li>
          <li>Ödeme ve faturalama kuruluşları</li>
          <li>Google / Apple gibi kimlik sağlayıcıları (sosyal giriş tercih ettiğinizde)</li>
          <li>Hukuk, mali müşavirlik ve denetim danışmanları (gizlilik taahhüdü altında)</li>
          <li>İlanınızı inceleyen diğer kullanıcılar (sizin yayımladığınız içerik ölçüsünde)</li>
        </ul>
        <p>
          <strong>Yurt içi aktarım (m.8):</strong> yukarıdaki hukuki sebeplere dayanır.
        </p>
        <p>
          <strong>Yurt dışı aktarım (m.9):</strong> yalnızca (i) ilgili kişinin açık rızası, (ii)
          Kurul’ca ilan edilen yeterli korumaya sahip ülke, (iii) yeterli korumayı yazılı olarak
          taahhüt eden veri sorumlusunun Kurul izni veya (iv) m.9’daki diğer istisnalar
          sağlandığında yapılır. Bulut ve analiz altyapısı yurt dışında konumlanıyorsa bu
          güvenceler aranır.
        </p>
      </section>

      <section className="mt-8">
        <h2>6. Saklama süreleri ve imha (KVKK m.7)</h2>
        <p>
          Veriler, işlendikleri amaç için gerekli süre ve mevzuatta öngörülen zamanaşımı / saklama
          süreleriyle sınırlı tutulur. Örnekler:
        </p>
        <ul>
          <li>Üyelik kayıtları: üyelik süresince ve sona ermesinden sonra uyuşmazlık zamanaşımı</li>
          <li>İlan ve mesajlar: yayım ve yasal saklama süreleri</li>
          <li>5651 sayılı Kanun kapsamındaki trafik/log: kanuni süre</li>
          <li>Fatura ve ticari defterler: VUK ve TTK saklama süreleri (kural olarak 10 yıl)</li>
          <li>Çerez onay kayıtları: ispat için en az 2 yıl veya ilgili mevzuat süresi</li>
          <li>Pazarlama rızası: rıza geri alınıncaya veya süre doluncaya kadar</li>
        </ul>
        <p>
          Süre bitiminde veriler KVKK m.7 ve ilgili Yönetmelik uyarınca silinir, yok edilir veya
          anonim hale getirilir. Periyodik imha süreçleri uygulanır.
        </p>
      </section>

      <section id="cerezler" className="mt-8 scroll-mt-24">
        <h2>7. Çerez nedir? (Çerez Aydınlatma Metni)</h2>
        <p>
          Çerez, ziyaret ettiğiniz internet sitesinin tarayıcınıza bıraktığı küçük bir metin
          dosyasıdır. Oturum çerezleri tarayıcı kapanınca silinir; kalıcı çerezler belirlenen süre
          boyunca cihazınızda kalır. Birinci taraf çerezleri {LEGAL_BRAND} tarafından, üçüncü
          taraf çerezleri ise hizmet aldığımız iş ortaklarınca yerleştirilebilir.
        </p>
        <h3>7.1. Kullandığımız çerez türleri</h3>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-elev text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Tür</th>
                <th className="px-3 py-2 font-semibold">Örnek / ad</th>
                <th className="px-3 py-2 font-semibold">Amaç</th>
                <th className="px-3 py-2 font-semibold">Süre</th>
                <th className="px-3 py-2 font-semibold">Hukuki sebep</th>
              </tr>
            </thead>
            <tbody className="text-soft">
              <tr className="border-t border-line">
                <td className="px-3 py-2 font-semibold text-lime">Zorunlu</td>
                <td className="px-3 py-2">alsatport-cookie-consent-v2, oturum</td>
                <td className="px-3 py-2">
                  Çerez onay kaydı, oturum, güvenlik, dil, temel işlev. Platformun çalışması için
                  zorunludur; kapatılamaz.
                </td>
                <td className="px-3 py-2">Oturum / 12 ay</td>
                <td className="px-3 py-2">m.5/2(c), (ç), (f)</td>
              </tr>
              <tr className="border-t border-line bg-card/40">
                <td className="px-3 py-2 font-semibold">İşlevsel</td>
                <td className="px-3 py-2">alsatport-state-v2 (tercih kısımları)</td>
                <td className="px-3 py-2">Favori, arayüz ve kolaylık hatırlatmaları</td>
                <td className="px-3 py-2">6–12 ay</td>
                <td className="px-3 py-2">Açık rıza (m.5/1)</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2 font-semibold">Analitik</td>
                <td className="px-3 py-2">ölçüm / hata kimlikleri</td>
                <td className="px-3 py-2">Trafik, performans ve hata istatistiği</td>
                <td className="px-3 py-2">13 aya kadar</td>
                <td className="px-3 py-2">Açık rıza (m.5/1)</td>
              </tr>
              <tr className="border-t border-line bg-card/40">
                <td className="px-3 py-2 font-semibold">Pazarlama</td>
                <td className="px-3 py-2">kampanya / dönüşüm</td>
                <td className="px-3 py-2">İlgi alanına uygun ilan ve kampanya ölçümü</td>
                <td className="px-3 py-2">6–12 ay</td>
                <td className="px-3 py-2">Açık rıza (m.5/1)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3>7.2. Çerez tercihleriniz</h3>
        <p>
          İlk ziyaretinizde “Tüm Çerezleri Kabul Et”, “Çerez Tercihlerini Yönet” veya “Tüm
          Çerezleri Reddet” seçenekleri sunulur. Reddetme yalnızca zorunlu çerezleri bırakır.
          Tercihlerinizi daha sonra sayfa altındaki <strong>Çerez Ayarları</strong> ile
          değiştirebilirsiniz. Tarayıcı ayarlarından çerezleri silebilir veya engelleyebilirsiniz;
          zorunlu çerezlerin kapatılması oturum, güvenlik ve çerez onayının çalışmamasına yol
          açabilir.
        </p>
        <div className="mt-4">
          <CookiePrefsLink button />
        </div>
      </section>

      <section id="haklar" className="mt-8 scroll-mt-24">
        <h2>8. KVKK m.11 kapsamındaki haklarınız</h2>
        <p>
          KVKK m.11 uyarınca ilgili kişi olarak aşağıdaki hakların tamamına sahipsiniz. Bu
          listedeki hiçbir bent atlanmamıştır:
        </p>
        <ol>
          <li>
            Kişisel veri işlenip işlenmediğini öğrenme (m.11/1(a))
          </li>
          <li>Kişisel verileri işlenmişse buna ilişkin bilgi talep etme (m.11/1(b))</li>
          <li>
            Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp
            kullanılmadığını öğrenme (m.11/1(c))
          </li>
          <li>
            Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme
            (m.11/1(ç))
          </li>
          <li>
            Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini
            isteme (m.11/1(d))
          </li>
          <li>
            KVKK’nın 7 nci maddesinde öngörülen şartlar çerçevesinde kişisel verilerin silinmesini
            veya yok edilmesini isteme (m.11/1(e))
          </li>
          <li>
            (d) ve (e) bentleri uyarınca yapılan işlemlerin, kişisel verilerin aktarıldığı üçüncü
            kişilere bildirilmesini isteme (m.11/1(f))
          </li>
          <li>
            İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle
            kişinin kendisi aleyhine bir sonucun ortaya çıkmasına itiraz etme (m.11/1(g))
          </li>
          <li>
            Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğraması hâlinde
            zararın giderilmesini talep etme (m.11/1(ğ))
          </li>
        </ol>
        <p>
          Düzeltme (m.11/1(d)) ve silme/yok etme (m.11/1(e) ile m.7) talepleriniz, verinin
          aktarıldığı üçüncü kişilere de bildirilir (m.11/1(f)).
        </p>
      </section>

      <section id="basvuru" className="mt-8 scroll-mt-24">
        <h2>9. Başvuru usulü ve şikâyet hakkı</h2>
        <p>
          Taleplerinizi Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ’e uygun olarak;
          Türkçe, kimliğinizi tevsik eden bilgiler ve talebinizin açık içeriği ile aşağıdaki
          kanallardan iletebilirsiniz:
        </p>
        <ul>
          <li>
            E-posta: <Mail to={LEGAL_EMAIL_KVKK} />
          </li>
          <li>
            Destek: <Mail to={LEGAL_EMAIL_DESTEK} />
          </li>
          <li>
            KEP: {LEGAL_KEP}
          </li>
          <li>Güvenli elektronik imza veya mobil imza ile imzalanmış başvuru</li>
        </ul>
        <p>
          Başvurular, Tebliğ ve KVKK m.13 uyarınca ücretsiz olarak, en geç <strong>otuz gün</strong>{" "}
          içinde sonuçlandırılır. İşlemin ayrıca bir maliyet gerektirmesi hâlinde Kurul’ca
          belirlenen tarife uygulanabilir. Başvurunun reddi, cevabın yetersiz bulunması veya
          süresinde cevap verilmemesi durumunda KVKK m.14 uyarınca cevabı öğrendiğiniz tarihten
          itibaren otuz ve her hâlde başvuru tarihinden itibaren altmış gün içinde{" "}
          <strong>Kişisel Verileri Koruma Kurulu</strong>’na şikâyette bulunabilirsiniz. Şikâyet
          hakkı, kural olarak önce veri sorumlusuna başvuru şartına bağlıdır.
        </p>
      </section>

      <section className="mt-8">
        <h2>10. Güvenlik, çocuklar ve üçüncü kişi içerikleri</h2>
        <p>
          {LEGAL_BRAND}, KVKK m.12 uyarınca kişisel verilerin hukuka aykırı işlenmesini ve
          erişilmesini önlemek ve muhafazasını sağlamak için uygun teknik ve idari tedbirleri alır
          (erişim yetkisi, şifreleme, log, yedekleme, farkındalık).
        </p>
        <p>
          Platform 18 yaşından küçüklerin kullanımı için tasarlanmamıştır. Çocuklara ait verinin
          fark edilmesi hâlinde silinmesi için <Mail to={LEGAL_EMAIL_KVKK} /> üzerinden bildirimde
          bulunabilirsiniz.
        </p>
        <p>
          Kullanıcıların yayımladığı ilan, fotoğraf ve mesaj içeriklerinden doğan hukuka aykırılık
          iddialarında 5651 sayılı Kanun’daki ihbar ve çıkarma süreçleri saklıdır. Başka sitelere
          verilen bağlantılardaki işleme faaliyetlerinden {LEGAL_BRAND} sorumlu değildir.
        </p>
      </section>

      <section className="mt-8">
        <h2>11. Metin değişiklikleri</h2>
        <p>
          {LEGAL_BRAND} işbu KVKK / Çerez Aydınlatma Metnini mevzuat, Kurul kararları veya
          hizmet değişikliğine bağlı olarak güncelleyebilir. Güncel sürüm {LEGAL_WEB} ve Platform
          üzerindeki “KVKK / Çerez Aydınlatma Metni” bağlantısından yayımlanır. Önemli
          değişikliklerde çerez banner’ı veya üyelik bildirimi ile duyuru yapılabilir.
        </p>
        <p>
          Sorularınız için: <Mail to={LEGAL_EMAIL_KVKK} /> · <Mail to={LEGAL_EMAIL_DESTEK} />
        </p>
      </section>

      {!compact && (
        <p className="mt-10 text-center">
          <Link href="/" className="font-semibold text-lime">
            Ana sayfaya dön
          </Link>
        </p>
      )}
    </div>
  );
}
