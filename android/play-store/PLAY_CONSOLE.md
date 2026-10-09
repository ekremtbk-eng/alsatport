# Google Play Console hazırlığı — AlsatPort

Bu belge Play Console formları için **koddan çıkarılmış** bilgileri içerir. "Doğrulanmalı" işaretli maddeler
production ayarına veya işletme kararına bağlıdır; göndermeden önce kontrol edilmelidir.

## Mağaza kaydı

| Alan | Değer |
|---|---|
| Uygulama adı | AlsatPort |
| Paket adı | `com.alsatport.app` |
| Kategori | Alışveriş |
| İletişim e-postası | destek@alsatport.com (sitedeki destek adresi) |
| Web sitesi | https://alsatport.com |
| Gizlilik politikası | https://alsatport.com/gizlilik-politikasi |
| Hesap silme (web) | https://alsatport.com/gizlilik-politikasi#gp-silme |
| Uygulama içi hesap silme | Profil → Hesap ve Verilerim (`/profil?p=iptal`) |
| Uygulama simgesi | `play-store/icon-512.png` (512×512) |
| Öne çıkan görsel | `play-store/feature-graphic-1024x500.png` |
| Ekran görüntüleri | **Eksik** — gerçek cihaz/emülatörden en az 2 telefon (ve isteğe bağlı 7"/10" tablet) görüntüsü alınmalı |

### Kısa açıklama (80 karakter)

> Ücretsiz ilan ver, al, sat, keşfet. Emlak, vasıta ve ikinci el ilanları.

### Uzun açıklama (taslak)

> AlsatPort ile ilanlara her yerden ulaşın, ücretsiz ilan verin ve fırsatları keşfedin.
>
> • Emlak, vasıta, ikinci el ve sıfır ürünler, iş makineleri, ustalar ve hizmetler, iş ilanları ve daha fazlası
> • Gelişmiş filtreler ve akıllı ilan bulucu ile aradığınızı hızla bulun
> • Fotoğraflı ilanınızı dakikalar içinde yayınlayın
> • Satıcılarla uygulama içinden güvenle mesajlaşın
> • Favorilerinizi ve aramalarınızı kaydedin
> • Kurumsal hesap ile mağaza sayfanızı oluşturun
> • İki adımlı doğrulama ve Google ile güvenli giriş
>
> Kurallara aykırı ilanları ve kullanıcıları uygulama içinden şikâyet edebilir, istemediğiniz kullanıcıları
> engelleyebilirsiniz. Hesabınızı istediğiniz zaman uygulama içinden silebilirsiniz.

İngilizce kayıt da eklenecekse aynı içerik çevrilmelidir (site TR/EN/DE/AR/RU destekliyor).

## Veri güvenliği formu (koddan çıkarılan taslak)

Uygulama kabuğu (Android kodu) hiçbir veri toplamaz, izin istemez ve SDK içermez. Ancak uygulama, alsatport.com
web içeriğini gösterdiği için **sitenin topladığı veriler beyan edilmelidir**.

Genel cevaplar:
- Veriler aktarım sırasında şifreleniyor mu? **Evet** (yalnızca HTTPS, HSTS preload).
- Kullanıcı verilerinin silinmesini talep edebilir mi? **Evet** (uygulama içi + web bağlantısı).
- Veriler satılıyor mu / reklam için paylaşılıyor mu? **Hayır** (gizlilik politikası §9; kodda reklam/analitik SDK'sı yok).

| Veri türü (Play) | Kaynak (kod) | Zorunlu mu | Amaç |
|---|---|---|---|
| Ad | Kayıt, Google ile giriş, profil | Evet | Uygulama işlevi, hesap yönetimi |
| E-posta adresi | Kayıt, Google ile giriş, kurtarma e-postası | Evet | Hesap yönetimi, iletişim (hizmet e-postaları), güvenlik |
| Kullanıcı kimlikleri | Hesap kimliği, Google hesap kimliği | Evet | Hesap yönetimi |
| Telefon numarası | Profil (ilan vermek için) | İlan verenler için evet | Uygulama işlevi (alıcı iletişimi), dolandırıcılık önleme |
| Adres | Profil açık adresi (sunucuda şifreli) | İlan verenler için | Uygulama işlevi — **doğrulanmalı**: zorunluluk koşulu |
| Fotoğraflar | İlan ve profil fotoğrafları | İsteğe bağlı | Uygulama işlevi |
| Diğer uygulama içi mesajlar | Mesajlaşma | İsteğe bağlı | Uygulama işlevi |
| Diğer kullanıcı içeriği | İlan metinleri, değerlendirmeler, şikâyetler | İsteğe bağlı | Uygulama işlevi, moderasyon |
| Uygulama etkileşimleri / diğer işlemler | Favoriler, kayıtlı aramalar | İsteğe bağlı | Uygulama işlevi |
| Cihaz veya diğer kimlikler | Cihaz çerezi, cihaz parmak izi ve IP özetleri | Evet | Dolandırıcılık önleme, güvenlik |

Beyan edilmeyecekler (kodda yok):
- **Konum**: tarayıcı konumu yalnızca cihazda en yakın ili bulmak için kullanılıyor, sunucuya gönderilmiyor (KVKK §2). İlan konumu kullanıcının yazdığı il/ilçe — "Adres" değil, ilan içeriği.
- **Kişiler, takvim, sağlık, SMS, arama kaydı, yüklü uygulamalar**: toplanmıyor.
- **Teşhis / analiz**: üçüncü taraf analiz veya hata izleme SDK'sı yok.

Doğrulanmalı:
- **Finansal bilgi / satın alma geçmişi**: `/api/payments/*` (PayTR) kodda var. Production'da ödeme açıksa
  "Satın alma geçmişi" beyan edilmeli; kart bilgisi PayTR sayfasında girildiği için AlsatPort'ta saklanmıyor.
- **reCAPTCHA (Google)**: production'da açık (KVKK sayfasında listeli). Kayıt formunda IP/tarayıcı/etkileşim
  verisini Google toplar → "Cihaz veya diğer kimlikler — dolandırıcılık önleme" kapsamında belirtilmeli.
- Hizmet sağlayıcılar (Vercel, Neon, Vercel Blob, Hostinger SMTP, Google ile giriş) Play tanımına göre "paylaşım"
  sayılmaz (veri işleyen); KVKK sayfasıyla tutarlı olmalı.

## Hesap silme gereksinimi

- Uygulama içi: Profil → Hesap ve Verilerim → şifre (veya Google kullanıcıları için yeni giriş) + onay ifadesi.
  `/api/account/delete`: ilanlar kaldırılır, fotoğraflar depolamadan silinir, profil/favori/kayıtlı arama/
  değerlendirme/engellemeler silinir, mesaj içerikleri silinir, e-posta ve kullanıcı adı anonimleştirilir.
- Web: https://alsatport.com/gizlilik-politikasi#gp-silme — giriş yapamayan kullanıcı için KVKK e-posta başvurusu
  (`/kvkk#kvkk-basvuru`) var. **Doğrulanmalı**: Play formuna "hangi veriler silinir / ne kadar saklanır" bilgisi
  bu sayfadakiyle aynı yazılmalı (şikâyet ve yönetici kayıtları anonim saklanıyor).

## Kullanıcı içeriği (UGC) ve moderasyon

Kodda mevcut: ilan ve kullanıcı şikâyeti (`/api/reports`), kullanıcı engelleme (`/api/account/blocks`), yönetici
moderasyon paneli (şikâyetler, ilan onay/kaldırma, kullanıcı yasaklama), İlan Kuralları ve Kullanım Koşulları.
İlan kuralları ateşli silah, mermi ve patlayıcıları yasaklıyor.

Doğrulanmalı (politika incelemesi):
- Hayvan ilanları (Hayvanlar Alemi): Play'in yasa dışı/nesli tehlikedeki tür politikasına uygunluk.
- Deniz ekipmanı listesinde "Fişek" (işaret fişeği) — patlayıcı politikası açısından gözden geçirilmeli.

## İçerik derecelendirmesi (IARC) cevap notları

Kullanıcılar etkileşime giriyor (mesajlaşma) — **Evet**; kullanıcı içeriği paylaşılıyor — **Evet**;
konum paylaşımı — **Hayır** (cihaz konumu sunucuya gönderilmiyor); dijital satın alma — ödeme açıksa **Evet**.

## Hedef kitle

18 yaş altını hedeflemiyor (ilan/ticaret). "Çocuklara yönelik değil" seçilmeli.
