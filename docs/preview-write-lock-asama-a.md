# A Aşaması — Preview yazma kilidi (güvenlik doğrulama raporu)

| Alan | Değer |
|------|--------|
| Branch | `security/preview-write-lock` (local; **push/merge/deploy yok**) |
| Base | `origin/master` @ `510f8ba` |
| Production Neon | `winter-grass-10477068` / `main` (değiştirilmedi) |
| Doğrulama | 2026-10-16 |

## Değişen dosyalar (PR kapsamı)

| Dosya | Değişiklik |
|-------|------------|
| `src/lib/security/previewLock.ts` | **Yeni** — kilit bayrağı, hata tipi, 403 JSON |
| `src/lib/db.ts` | Prisma extension: model yazmaları + raw SQL + `$transaction` Preview’da engelli |
| `src/lib/security/session.ts` | `requireMutatingRequest` → Preview’da 403 |
| `src/lib/storage/media.ts` | Blob put/delete Preview’da engelli |
| `src/lib/listings/store.ts` | `bumpListingViews` Preview kilidinde soft-fail |
| `src/app/api/cron/listings/route.ts` | Cron GET Preview’da 403 |
| `scripts/test-preview-write-lock.ts` | İzole kapsamlı test |
| `docs/preview-write-lock-asama-a.md` | Bu rapor |

## Güvenlik denetiminde kapatılan boşluklar

| Bulgu | Risk | Düzeltme |
|-------|------|----------|
| `throttle` `$queryRaw` INSERT…RETURNING | Preview’da Production `rate_limit_buckets` yazımı | `$queryRaw` / `$queryRawUnsafe` kilit altında engelli |
| Interactive `$transaction` | Prisma 6’da ITX client query extension’ı atlayabiliyor | `$transaction` giriş noktası kilitleniyor |
| `PREVIEW_WRITE_LOCK=0` Preview env | Env ile kilidi kapatma | `VERCEL_ENV=preview` iken override **yok sayılır** |

## Engellenen işlemler (`VERCEL_ENV=preview`)

- Model: `create` / `createMany` / `createManyAndReturn` / `update` / `updateMany` / `updateManyAndReturn` / `upsert` / `delete` / `deleteMany`
- Raw: `$executeRaw` / `$executeRawUnsafe` / `$queryRaw` / `$queryRawUnsafe`
- `$transaction` (interactive + batch)
- Nested writes (üst işlem `create`/`update` …)
- Blob put/delete; CSRF’li mutasyon API’leri; cron listing sweep
- OAuth callback / verify-email / webhook / admin / mesaj / ilan / upload → Prisma veya Blob üzerinden durur
- GET view bump / session `lastSeenAt` → soft-fail (sayfa kırılmaz)

## Runtime’da Prisma dışı DB

- Uygulama kodu (`src/`) yalnızca `@/lib/db` Prisma istemcisini kullanır; `pg` / Neon SDK yok.
- Script’ler kendi `PrismaClient` açabilir (Vercel Preview runtime’ında çalışmaz).

## Korumanın sınırları

| Sınır | Açıklama |
|-------|----------|
| Okuma serbest | Preview hâlâ Production verisini **okuyabilir** (PII — B/C aşaması) |
| Geçici önlem | Asıl çözüm: ayrı Preview DB + env ayrımı |
| Deployment Password Protection | Hobby’de yok; Pro ~$20/proje/ay |
| Vercel Authentication | Hobby’de ücretsiz olabilir — bu PR’da etkinleştirilmedi |
| Acil unlock | Preview’da env ile açılamaz; kod/revert gerekir |

## Test sonuçları

| Suite | Sonuç |
|-------|--------|
| `PREVIEW_WRITE_LOCK=1` izole kilit | PASS (tüm yazma + raw + tx + nested) |
| `VERCEL_ENV=preview` + `PREVIEW_WRITE_LOCK=0` | PASS (kilit açık kalır) |
| Unlocked / `VERCEL_ENV=production` | PASS (kilit kapalı) |
| `tsc --noEmit` | 0 hata |
| eslint (değişen dosyalar) | temiz |
| `next build` | başarılı |
| `test:security` (local 127.0.0.1:3014 + :55433) | **89/89** |
| `test-return-to.ts` | **180/180** |
| `test-listing-required.ts` | **1350/1350** |

Production DB’ye test yazısı **yapılmadı**.

## Production / Development etkisi

| Ortam | Beklenen |
|-------|----------|
| Production (`VERCEL_ENV=production`) | Değişmez |
| Local (VERCEL_ENV yok) | Değişmez |
| Preview | Yazmalar engellenir; okuma devam eder |

## Branch çakışması

- `origin/feat/mobile-filter-redesign`, `release/mobile-premium-stage7`, `fix/mobile-critical`, listing UX remote’ları: master’a göre **0 commit ahead** (çakışma yok).
- Bu PR yalnızca güvenlik dosyalarına dokunur; mobil UI değişikliği yok.
- `stash@{0}` (csrf-2fa-fix) dokunulmadı.

## Geri dönüş planı

1. PR’ı merge etme / revert  
2. Preview’da env ile unlock **mümkün değil** (bilinçli)  
3. `DATABASE_URL` bu işin parçası değil  

## PR hazırlık (onay bekleniyor)

İçerik (yalnızca güvenlik):

```
src/lib/security/previewLock.ts
src/lib/db.ts
src/lib/security/session.ts
src/lib/storage/media.ts
src/lib/listings/store.ts
src/app/api/cron/listings/route.ts
scripts/test-preview-write-lock.ts
docs/preview-write-lock-asama-a.md
```

Önerilen başlık: `security: block Preview writes against shared Production DB`

Push / merge / deploy için onay bekleniyor.
