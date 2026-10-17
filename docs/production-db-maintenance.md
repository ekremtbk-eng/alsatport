# Production veritabanı bakımı (migrate / seed)

Bu belge, `npm run build` akışından **ayrılmış** Prisma migration ve seed işlemleri içindir.

## Varsayılan (güvenli)

| Ortam | `npm run build` | `npm run db:maintain` (flags yok) |
|-------|-----------------|-------------------------------------|
| Local | `prisma generate && next build` — **migrate/seed yok** | Hiçbir şey yapmaz, exit 0 |
| Vercel Preview | Aynı build — **migrate/seed yok** | Flags set edilse bile **red** (exit 1) |
| Vercel Production | Aynı build — **migrate/seed yok** | Flags yoksa no-op |

`vercel.json` özel `buildCommand` tanımlamaz; Vercel `package.json` → `build` kullanır.

## Opt-in bayraklar (yalnızca literal `1`)

| Env | Etki |
|-----|------|
| `ALLOW_PROD_MIGRATE=1` | `prisma migrate deploy` |
| `ALLOW_PROD_SEED=1` | Base seed (`prisma/seed.ts`: kategoriler + özel günler, insert-only) |
| `SEED_DEMO_LISTINGS=1` | Demo seed — **Vercel Production’da yasak** (exit 1) |

`0`, `true`, boş veya tanımsız → kapalı.

## Yeni migration gerektiğinde (onaylı prosedür)

1. PR’da migration SQL’ini ekle; Production’a merge **öncesi** şema etkisini gözden geçir.
2. Ayrı **açık onay** al (bu belge + operatör onayı). Vercel env’e kalıcı `ALLOW_PROD_*=1` **ekleme**.
3. Hedef DB’nin Production olduğunu çift kontrol et (Neon `main` / Production `DATABASE_URL` host). Preview URL kullanma.
4. Tek seferlik, yerel veya kontrollü shell’de (örnek):

```bash
# Yalnızca migrate
ALLOW_PROD_MIGRATE=1 DATABASE_URL="<production-url>" npm run db:maintain

# Yalnızca base seed (nadiren; mevcut satırlar güncellenmez)
ALLOW_PROD_SEED=1 DATABASE_URL="<production-url>" npm run db:maintain

# İkisi birden (ayrı onay önerilir)
ALLOW_PROD_MIGRATE=1 ALLOW_PROD_SEED=1 DATABASE_URL="<production-url>" npm run db:maintain
```

5. Bayrakları shell’de bırakma; Vercel Dashboard’a yazma.
6. Uygulama sonrası: `prisma migrate status` / kategori-özel gün sayımları (salt-okunur).

## Seed logları

`prisma/seed.ts` insert-only’dir (`createMany` + `skipDuplicates`; special day `upsert` + boş `update`).

Loglar **gerçekten eklenen** satır sayısını ve kaynak/attempted sayısını ayrı yazmalıdır (ör. `inserted=0 attempted=679`). Eski “Seeded 679” ifadesi kaynak boyutu anlamına geliyordu; yanıltıcıdır.

## Geri dönüş

- Build’i eski haline almak: `package.json` `build` içine `node scripts/prisma-deploy.mjs` eklemek (önerilmez).
- Acil şema: onaylı `ALLOW_PROD_MIGRATE=1` ile `db:maintain`.
