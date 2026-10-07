import Link from "next/link";
import { LEGAL_BRAND, LEGAL_EMAIL_DESTEK } from "@/data/legal";
import { LegalHeader, LegalToc, Mail } from "@/components/legal/LegalUi";

export function ListingRulesBody() {
  return (
    <div className="legal-prose text-sm leading-relaxed">
      <LegalHeader kicker="Topluluk kuralları" title="İlan Kuralları" />
      <p className="mt-4">
        {LEGAL_BRAND}’un güvenli kalması için tüm ilanların aşağıdaki kurallara uyması gerekir. Bu kurallar{" "}
        <Link href="/kullanim-kosullari" className="font-semibold text-lime">
          Kullanım Koşulları
        </Link>
        ’nın parçasıdır.
      </p>

      <LegalToc
        items={[
          ["#ik-dogru", "Doğru bilgi"],
          ["#ik-gorsel", "Görseller"],
          ["#ik-kisisel", "Kişisel veriler"],
          ["#ik-yasakli", "Yasaklı ürünler"],
          ["#ik-dolandiricilik", "Dolandırıcılık"],
          ["#ik-spam", "Spam"],
          ["#ik-telif", "Telif ve marka"],
          ["#ik-sikayet", "Şikâyet"],
          ["#ik-yaptirim", "Yaptırımlar"],
        ]}
      />

      <section id="ik-dogru" className="mt-6">
        <h2>1. Yanıltıcı ilan yasaktır</h2>
        <ul>
          <li>İlan, gerçekten elinizde olan ve satmaya, kiralamaya ya da sunmaya yetkili olduğunuz bir ürün veya hizmete ait olmalıdır.</li>
          <li>Başlık, fiyat, kategori, konum ve özellikler gerçeği yansıtmalıdır; kusurlar gizlenmemelidir.</li>
          <li>Gerçek dışı düşük fiyatla dikkat çekip farklı fiyat istemek, “temsili” ilan vermek yasaktır.</li>
          <li>Her ilan tek bir ürün veya hizmete ait olmalı, doğru kategoride yayımlanmalıdır.</li>
        </ul>
      </section>

      <section id="ik-gorsel">
        <h2>2. Başkasına ait görseller</h2>
        <ul>
          <li>Yalnızca kendi çektiğiniz veya kullanma hakkına sahip olduğunuz fotoğrafları kullanınız.</li>
          <li>Başka ilanlardan, sitelerden veya katalog/üretici sayfalarından izinsiz fotoğraf kopyalamayınız.</li>
          <li>Fotoğraf, satılan ürünü göstermelidir; ilgisiz, yanıltıcı veya müstehcen görsel yüklenemez.</li>
        </ul>
      </section>

      <section id="ik-kisisel">
        <h2>3. Kişisel verilerin korunması</h2>
        <ul>
          <li>
            İlan metninde ve fotoğraflarda başkalarına ait kişisel verilere (yüz, ad, telefon, adres, plaka, kimlik,
            fatura, ruhsat veya tapu belgesi bilgileri) yer vermeyiniz; gerekiyorsa bulanıklaştırınız.
          </li>
          <li>Kendi T.C. kimlik numaranızı, banka hesap bilgilerinizi veya açık adresinizi ilan metnine yazmayınız.</li>
          <li>Mesajlaşmada edindiğiniz kişisel verileri yalnızca o alışveriş için kullanabilirsiniz.</li>
        </ul>
      </section>

      <section id="ik-yasakli">
        <h2>4. Yasaklı ürün ve hizmetler</h2>
        <p>Aşağıdakilerin ilanı verilemez:</p>
        <ul>
          <li>Satışı veya bulundurulması yasak olan her türlü ürün; uyuşturucu ve uyarıcı maddeler,</li>
          <li>Ateşli silahlar, mermi, patlayıcı ve ruhsata tabi silahlar,</li>
          <li>Reçeteli ilaçlar, tıbbi cihazlar için mevzuatın izin vermediği satışlar,</li>
          <li>Çalıntı, kaçak veya sahte (taklit) ürünler,</li>
          <li>
            Evcil hayvan (kedi, köpek, kuş, balık, kemirgen, sürüngen vb.) satışı ve ücretli sahiplendirme; canlı hayvan
            ilanları yalnızca Çiftlik Hayvanları kategorisinde (büyükbaş, küçükbaş, kümes hayvanları) ve ilgili mevzuata
            (küpe/kayıt, sağlık belgesi, hayvan hareketleri izni) uygun olarak verilebilir. Evcil hayvan aksesuar, mama ve
            bakım ürünleri serbesttir,
          </li>
          <li>İnsan organı, kan ve vücut ürünleri,</li>
          <li>Sahte belge, kimlik, diploma; hesap, abonelik veya kişisel veri satışı,</li>
          <li>Kumar, bahis, piramit/saadet zinciri ve benzeri yasa dışı kazanç vaatleri,</li>
          <li>Müstehcen içerik ve cinsel hizmetler,</li>
          <li>Koruma altındaki bitki ve hayvan türleri ile tarihi eser niteliğindeki ürünler.</li>
        </ul>
      </section>

      <section id="ik-dolandiricilik">
        <h2>5. Dolandırıcılık</h2>
        <ul>
          <li>Ürünü göstermeden kapora, ön ödeme veya “kargo ücreti” istemek,</li>
          <li>Sahte ödeme dekontu, sahte kargo veya “güvenli ödeme” bağlantısı göndermek,</li>
          <li>Kullanıcıları {LEGAL_BRAND} dışındaki sahte sayfalara yönlendirmek veya şifre/doğrulama kodu istemek,</li>
          <li>Başkasının kimliğine veya işletmesine bürünmek</li>
        </ul>
        <p>kesinlikle yasaktır ve tespit edildiğinde hesap derhâl kapatılır; gerekirse yetkili makamlara bildirilir.</p>
      </section>

      <section id="ik-spam">
        <h2>6. Spam</h2>
        <ul>
          <li>Aynı ürün için birden fazla ilan vermek veya ilanı silip tekrar yayımlamak,</li>
          <li>İlgisiz anahtar kelimeler, başka sitelerin reklamı veya bağlantıları eklemek,</li>
          <li>Toplu, otomatik veya istenmeyen mesaj göndermek</li>
        </ul>
        <p>yasaktır.</p>
      </section>

      <section id="ik-telif">
        <h2>7. Telif ve marka hakları</h2>
        <p>
          Başkasının marka, logo, eser veya tasarımını izinsiz kullanmak; orijinal olmayan ürünü marka adıyla
          “orijinal” gibi sunmak yasaktır. Hak sahipleri ihlal içeren ilanı “Telif/marka ihlali” nedeniyle şikâyet
          edebilir veya hak sahipliğini gösteren bilgilerle <Mail to={LEGAL_EMAIL_DESTEK} /> adresine başvurabilir.
        </p>
      </section>

      <section id="ik-sikayet">
        <h2>8. Şikâyet sistemi</h2>
        <p>
          Her ilan sayfasında “Şikâyet Et” düğmesi bulunur. Şikâyet nedeni olarak şunlardan birini seçebilirsiniz:
        </p>
        <ul>
          <li>Yanıltıcı / sahte ilan</li>
          <li>Dolandırıcılık şüphesi</li>
          <li>Yasaklı içerik</li>
          <li>Telif / marka ihlali</li>
          <li>Kişisel veri ihlali</li>
          <li>Uygunsuz içerik</li>
          <li>Diğer</li>
        </ul>
        <p>
          Şikâyet göndermek için giriş yapmanız gerekir. Şikâyetiniz yalnızca yöneticiler tarafından görülür ve
          ilan sahibine kimliğiniz bildirilmez. Aynı ilan için açık bir şikâyetiniz varken yenisi oluşturulmaz.
          Bilerek asılsız şikâyette bulunmak da kural ihlalidir.
        </p>
      </section>

      <section id="ik-yaptirim">
        <h2>9. İlanın kaldırılması ve hesabın sınırlandırılması</h2>
        <p>Kurallara aykırılık tespit edildiğinde aykırılığın ağırlığına göre:</p>
        <ul>
          <li>ilan onaylanmayabilir veya yayından kaldırılabilir,</li>
          <li>ilanın düzeltilmesi istenebilir,</li>
          <li>hesap geçici veya süresiz olarak askıya alınabilir (askıdaki hesapla giriş yapılamaz ve ilan verilemez).</li>
        </ul>
        <p>
          Kararlar şikâyet ve inceleme kayıtlarına dayanılarak yöneticiler tarafından verilir ve kayıt altına alınır.
          Bir karara itiraz etmek için <Mail to={LEGAL_EMAIL_DESTEK} /> adresine yazabilirsiniz.
        </p>
      </section>
    </div>
  );
}
