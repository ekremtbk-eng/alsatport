# AlsatPort — Güvenlik Olayı Müdahale Planı

Bu belge, kodda gerçekten bulunan mekanizmalara dayanır. Yasal bildirim süreleri burada **bilerek yazılmamıştır**;
güncel süre ve usul için KVKK mevzuatını, Kişisel Verileri Koruma Kurulu kararlarını ve hukuk danışmanınızı esas alın.

## 0. Rol ve iletişim

| Rol | Kim | Not |
| --- | --- | --- |
| Olay sorumlusu | Proje sahibi | Karar ve dış iletişim |
| Teknik müdahale | Proje sahibi / görevlendirilen geliştirici | Vercel, Neon, Blob, DNS erişimi |
| Hukuki danışman | (doldurun) | KVKK bildirimi ve ilgili kişilere bildirim |

Güvenlik uyarıları `ADMIN_EMAIL` adresine gider (yönetici girişi, başarısız yönetici girişi, rol değişikliği, yeni cihaz).

## 1. Tespit

Olası tetikleyiciler:

- `ADMIN_EMAIL` adresine gelen "Yönetici paneline giriş", "Başarısız yönetici girişi", "Yönetici rolü değişti" e-postaları.
- Kullanıcıdan "Hesabınıza yeni bir cihazdan giriş yapıldı" e-postası hakkında şikâyet.
- Vercel loglarında olağandışı 401/403/429 artışı.
- `audit_logs` tablosunda beklenmeyen kayıtlar (aşağıdaki sorgular).

Salt-okunur inceleme sorguları (Neon SQL Editor):

```sql
-- Son 48 saatteki yönetici ve güvenlik olayları
SELECT created_at, action, actor_id, entity_type, entity_id, ip, user_agent, payload
FROM audit_logs
WHERE created_at > now() - interval '48 hours'
  AND (action LIKE 'admin.%' OR action LIKE 'auth.%' OR action LIKE 'account.%')
ORDER BY created_at DESC;

-- Yönetici hesapları
SELECT id, email, created_at FROM users WHERE role = 'admin';

-- Bir kullanıcının açık oturumları (IP'ler maskelidir)
SELECT id, method, user_agent, ip_masked, created_at, last_seen_at, mfa_at
FROM user_sessions
WHERE user_id = '<USER_ID>' AND revoked_at IS NULL AND expires_at > now()
ORDER BY last_seen_at DESC;
```

## 2. Sınırlama (ilk 1 saat)

Önce kanıtı koruyun: ilgili Vercel loglarını ve yukarıdaki sorgu çıktılarını dışa aktarın; hiçbir kaydı silmeyin.

| Durum | Eylem |
| --- | --- |
| Tek kullanıcı hesabı ele geçirilmiş | Kullanıcı Profil → Hesap Güvenliği → Oturumlar → "Tüm Diğer Cihazlardan Çıkış Yap" ve şifre değişikliği. Kullanıcı erişemiyorsa yönetici panelinden hesabı geçici olarak engelleyin (engelleme tüm oturumları kapatır). |
| Yönetici hesabı şüpheli | Hemen şifre değiştirin (tüm oturumlar kapanır), e-posta hesabının şifresini ve 2FA'sını yenileyin, `audit_logs` içinde `admin.%` kayıtlarını inceleyin. |
| `AUTH_SECRET` sızmış olabilir | Vercel'de `AUTH_SECRET` değerini yenileyip yeniden deploy edin: tüm oturum çerezleri, e-posta doğrulama ve şifre sıfırlama bağlantıları geçersiz olur; herkes yeniden giriş yapar. |
| Veritabanı kimlik bilgisi sızmış olabilir | Neon'da rol şifresini sıfırlayın, Vercel'de `DATABASE_URL` / `DIRECT_URL` değerlerini güncelleyip yeniden deploy edin. |
| Blob token sızmış olabilir | Vercel Blob token'ını yenileyin, `BLOB_READ_WRITE_TOKEN` değerini güncelleyip yeniden deploy edin. |
| SMTP / Resend / OAuth / PayTR anahtarı sızmış olabilir | İlgili sağlayıcı panelinden anahtarı iptal edip yenisini oluşturun, Vercel ortam değişkenini güncelleyin, yeniden deploy edin. |
| Yoğun bot / kaba kuvvet trafiği | Uygulama içi sınırlar (`rate_limit_buckets`) otomatik devrededir. Ek olarak Vercel Firewall'da ilgili IP/ülke/yol için kural ekleyin. |
| Kötü amaçlı ilan / dolandırıcılık | Yönetici panelinden ilanı kaldırın ve gerekirse satıcıyı engelleyin; şikâyet kaydını "çözüldü" olarak kapatın. |

Tüm kullanıcıların oturumlarını acil kapatmak gerekirse en güvenli yol `AUTH_SECRET` rotasyonudur (kod değişikliği ve
toplu SQL gerektirmez).

## 3. Kök neden ve temizlik

1. Saldırının giriş noktasını belirleyin (çalınan şifre, sızan anahtar, uygulama açığı, üçüncü taraf).
2. Uygulama açığıysa düzeltmeyi yerelde test edin; `npm run test:security` ve üretim derlemesi geçmeden deploy etmeyin.
3. Etkilenen kullanıcıları ve veri türlerini `audit_logs`, Vercel logları ve sağlayıcı loglarından çıkarın.

## 4. Kurtarma

- Veri kaybı veya bozulma varsa Neon "Point-in-time restore" ile **önce yeni bir branch** oluşturup doğrulayın; ana
  veritabanının üzerine doğrudan geri yükleme yapmayın.
- Blob nesneleri için Vercel Blob'da sürümleme/yedek bulunmadığını varsayın; silinen dosyalar geri gelmeyebilir.

## 5. Bildirim

- Kişisel veri ihlali şüphesinde hukuk danışmanıyla birlikte KVKK kapsamındaki bildirim yükümlülüğünü ve süresini
  güncel mevzuata göre değerlendirin.
- İlgili kişilere bildirim gerekiyorsa metin; ne olduğunu, hangi veri türlerinin etkilendiğini, alınan önlemleri ve
  kullanıcının yapması gerekenleri (şifre değişikliği vb.) içermelidir.
- Ödeme verisi söz konusuysa PayTR ile iletişime geçin (kart verisi AlsatPort'ta saklanmaz; ödeme PayTR sayfasında alınır).

## 6. Olay sonrası

- Zaman çizelgesi, kök neden, etkilenen kapsam ve kalıcı düzeltmeleri bu dosyanın altına tarihli bir not olarak ekleyin.
- Yönetici hesabı etkilendiyse tüm yönetici hesaplarının 2FA e-posta hesaplarını yeniden gözden geçirin.
