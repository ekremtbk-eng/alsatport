import Link from "next/link";
import { LEGAL_BRAND, LEGAL_DOMAIN, LEGAL_EMAIL_DESTEK } from "@/data/legal";
import { ControllerIdentity, LegalHeader, LegalToc, Mail } from "@/components/legal/LegalUi";

export function TermsOfServiceBody({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`legal-prose leading-relaxed ${compact ? "text-[13px]" : "text-sm"}`}>
      <LegalHeader kicker="Sözleşme" title="Kullanım Koşulları" compact={compact} />
      <p className="mt-4">
        Bu koşullar, {LEGAL_BRAND} ({LEGAL_DOMAIN}) sitesinin ve hizmetlerinin kullanımına ilişkin kuralları
        belirler. Üye olurken bu koşulları kabul etmiş olursunuz. Kişisel verilerinizin işlenmesi bu koşulların
        parçası değildir; bu konuda{" "}
        <Link href="/kvkk" className="font-semibold text-lime">
          KVKK Aydınlatma Metni
        </Link>{" "}
        ve{" "}
        <Link href="/gizlilik-politikasi" className="font-semibold text-lime">
          Gizlilik Politikası
        </Link>{" "}
        bilgilendirme amacıyla yayımlanmıştır.
      </p>

      <LegalToc
        items={[
          ["#kk-taraflar", "Taraflar"],
          ["#kk-hizmet", "Hizmet"],
          ["#kk-ucret", "Ücret"],
          ["#kk-uyelik", "Üyelik"],
          ["#kk-ilan", "İlanlar"],
          ["#kk-alisveris", "Alışveriş"],
          ["#kk-yasak", "Yasak davranışlar"],
          ["#kk-sikayet", "Şikâyet ve yaptırım"],
          ["#kk-fikri", "Fikri haklar"],
          ["#kk-sorumluluk", "Sorumluluk"],
          ["#kk-fesih", "Hesabın kapatılması"],
          ["#kk-degisiklik", "Değişiklikler"],
        ]}
      />

      <section id="kk-taraflar" className="mt-6">
        <h2>1. Taraflar</h2>
        <p>Bu koşullar, siteyi kullanan kişi (“kullanıcı”) ile aşağıda belirtilen hizmet sağlayıcı arasında geçerlidir:</p>
        <ControllerIdentity />
      </section>

      <section id="kk-hizmet">
        <h2>2. Hizmetin niteliği</h2>
        <p>
          {LEGAL_BRAND}, kullanıcıların ürün, araç, emlak ve hizmet ilanı yayımlayabildiği, ilanları arayıp
          inceleyebildiği ve birbirleriyle mesajlaşabildiği bir ilan platformudur. {LEGAL_BRAND}, 5651 sayılı Kanun
          ve 6563 sayılı Kanun kapsamında <strong>yer sağlayıcı</strong> ve aracı hizmet sağlayıcı sıfatıyla
          hareket eder:
        </p>
        <ul>
          <li>İlanlardaki ürün veya hizmetin satıcısı, alıcısı ya da aracısı değildir.</li>
          <li>Kullanıcılar arasındaki alım-satım, kiralama veya hizmet sözleşmelerinin tarafı değildir.</li>
          <li>Ödeme almaz, ödemeye aracılık etmez, ürünü teslim etmez veya kargolamaz.</li>
          <li>
            İlan içeriğini kullanıcı hazırlar; {LEGAL_BRAND} ilanları yayından önce veya sonra kurallara uygunluk
            açısından denetleyebilir, ancak ilan bilgilerinin doğruluğunu, ürünün varlığını, niteliğini veya yasal
            durumunu garanti etmez.
          </li>
        </ul>
      </section>

      <section id="kk-ucret">
        <h2>3. Ücret</h2>
        <p>
          {LEGAL_BRAND}’un mevcut temel ilan hizmetleri ücretsizdir. İleride ücretli özellikler sunulması hâlinde
          ilgili koşullar hizmet kullanıma açılmadan önce ayrıca duyurulur.
        </p>
      </section>

      <section id="kk-uyelik">
        <h2>4. Üyelik</h2>
        <ul>
          <li>Üye olmak için 18 yaşını doldurmuş ve fiil ehliyetine sahip olmanız gerekir.</li>
          <li>
            Kayıtta ve profilde verdiğiniz bilgilerin doğru ve güncel olması sizin sorumluluğunuzdadır. Başkası adına
            veya sahte bilgilerle hesap açılamaz.
          </li>
          <li>
            Hesap güvenliğinden (şifrenizin gizliliği, cihazlarınızın güvenliği) siz sorumlusunuz. Hesabınızın izinsiz
            kullanıldığını düşünüyorsanız şifrenizi değiştirip <Mail to={LEGAL_EMAIL_DESTEK} /> adresine bildiriniz.
          </li>
          <li>
            İlan verebilmek için profilinizde ad-soyad, telefon, doğrulanmış e-posta ve açık adres bulunması gerekir.
          </li>
          <li>Hesaplar kişiseldir; devredilemez, satılamaz.</li>
        </ul>
      </section>

      <section id="kk-ilan">
        <h2>5. İlanlar</h2>
        <ul>
          <li>
            İlan verirken{" "}
            <Link href="/ilan-kurallari" className="font-semibold text-lime">
              İlan Kuralları
            </Link>
            ’na uymayı kabul edersiniz. İlan Kuralları bu koşulların ayrılmaz parçasıdır.
          </li>
          <li>
            İlanın içeriğinden, fotoğraflardan, fiyattan ve ilgili mevzuata (tüketici, vergi, ruhsat, fikri mülkiyet
            mevzuatı dahil) uygunluğundan ilanı veren kullanıcı sorumludur.
          </li>
          <li>
            İlanlar belirli bir süre yayında kalır; süresi dolan ilanları yenileyebilir veya istediğiniz zaman
            yayından kaldırabilirsiniz.
          </li>
          <li>
            Yayımladığınız ilan içeriğinin sitede ve ilanınızın paylaşılması için gereken ölçüde (ör. ilan bağlantısı
            önizlemesi) gösterilmesine izin vermiş olursunuz. Bu izin, ilan yayından kalktığında sona erer.
          </li>
        </ul>
      </section>

      <section id="kk-alisveris">
        <h2>6. Kullanıcılar arasındaki alışveriş</h2>
        <ul>
          <li>
            Alım-satımın koşullarını (fiyat, teslim, ödeme, iade) alıcı ve satıcı kendi aralarında belirler ve bundan
            yalnızca kendileri sorumludur.
          </li>
          <li>
            Ürünü görmeden kapora veya ön ödeme göndermeyiniz; platform dışına yönlendiren bağlantılara ve kişisel
            bilgi isteyen mesajlara itibar etmeyiniz. Şüpheli durumları “Şikâyet Et” düğmesiyle bildiriniz.
          </li>
          <li>
            Satıcının tacir olması hâlinde tüketici mevzuatından doğan yükümlülükler satıcıya aittir.
          </li>
        </ul>
      </section>

      <section id="kk-yasak">
        <h2>7. Yasak davranışlar</h2>
        <ul>
          <li>Hukuka aykırı, yanıltıcı veya başkalarının haklarını ihlal eden içerik yayımlamak,</li>
          <li>Dolandırıcılık, kimlik avı (phishing) veya sahte ödeme bildirimi gibi aldatıcı işlemler yapmak,</li>
          <li>Spam, toplu veya otomatik mesaj göndermek, aynı ilanı tekrar tekrar yayımlamak,</li>
          <li>Siteyi otomatik araçlarla (bot, scraper) taramak, verileri toplu olarak kopyalamak,</li>
          <li>Güvenlik önlemlerini aşmaya, başkalarının hesabına erişmeye veya sistemi aksatmaya çalışmak,</li>
          <li>Diğer kullanıcıların kişisel verilerini izinsiz toplamak, paylaşmak veya ilan dışı amaçla kullanmak,</li>
          <li>Taciz, tehdit, hakaret veya nefret söylemi içeren mesajlar göndermek.</li>
        </ul>
      </section>

      <section id="kk-sikayet">
        <h2>8. Şikâyet ve yaptırımlar</h2>
        <p>
          Her ilan sayfasındaki “Şikâyet Et” düğmesiyle kurallara aykırı içerikleri bildirebilirsiniz. Şikâyetler
          yöneticiler tarafından incelenir. Kurallara aykırılık tespit edilirse, aykırılığın ağırlığına göre ilan
          yayından kaldırılabilir, düzenlenmesi istenebilir veya hesap geçici ya da süresiz olarak
          sınırlandırılabilir. Hukuka aykırı içerikler hakkında yetkili makamlardan gelen kararlar uygulanır.
          Hakkınızda verilen bir karara itiraz etmek için <Mail to={LEGAL_EMAIL_DESTEK} /> adresine yazabilirsiniz.
        </p>
      </section>

      <section id="kk-fikri">
        <h2>9. Fikri mülkiyet</h2>
        <p>
          Sitenin tasarımı, logosu ve yazılımı {LEGAL_BRAND}’a aittir ve izinsiz kopyalanamaz. İlan içerikleri
          üzerindeki haklar ilanı yayımlayan kullanıcıya veya hak sahibine aittir. Hakkınızın ihlal edildiğini
          düşünüyorsanız ilgili ilanı “Telif/marka ihlali” nedeniyle şikâyet edebilir veya{" "}
          <Mail to={LEGAL_EMAIL_DESTEK} /> adresine bildirebilirsiniz.
        </p>
      </section>

      <section id="kk-sorumluluk">
        <h2>10. Sorumluluk</h2>
        <p>
          {LEGAL_BRAND}, kullanıcılar arasındaki işlemlerden, ilan içeriğinin doğruluğundan ve kullanıcıların
          birbirlerine verdiği zararlardan, kendisine yüklenebilecek bir kusur bulunmadıkça sorumlu değildir. Site,
          makul özenle ve kesintisiz çalışması hedeflenerek sunulur; ancak bakım, arıza veya üçüncü taraf hizmet
          sağlayıcılarından kaynaklanan kesintiler yaşanabilir. Bu madde, {LEGAL_BRAND}’un kast veya ağır ihmalinden
          doğan sorumluluğunu ve emredici mevzuattan doğan haklarınızı sınırlamaz.
        </p>
      </section>

      <section id="kk-fesih">
        <h2>11. Hesabın kapatılması</h2>
        <p>
          Hesabınızı istediğiniz zaman{" "}
          <Link href="/profil?p=iptal" className="font-semibold text-lime">
            Hesap ve Verilerim
          </Link>{" "}
          ekranından silebilirsiniz; silme işleminde ilanlarınız yayından kaldırılır. {LEGAL_BRAND}, bu koşulların
          ciddi veya tekrarlanan ihlali hâlinde hesabı sınırlandırabilir veya kapatabilir.
        </p>
      </section>

      <section id="kk-degisiklik">
        <h2>12. Değişiklikler ve uygulanacak hukuk</h2>
        <p>
          Bu koşullar güncellenebilir; güncel metin bu sayfada yayımlanır ve önemli değişiklikler sitede duyurulur.
          Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır. Tüketici sıfatıyla taraf olduğunuz uyuşmazlıklarda
          tüketici hakem heyetleri ve tüketici mahkemelerine başvurma hakkınız saklıdır.
        </p>
      </section>
    </div>
  );
}
