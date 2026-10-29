# A1 — Emlak / Vasıta taslak ilanları (EİDS öncesi)

## Migration

**Yeni Prisma migration gerekmez.** `ListingStatus.draft` şemada zaten vardı; A1 yalnızca create/publish yollarını ve UI’yi kullanır.

Production’da `prisma migrate` çalıştırılmamalı (bu PR için).

## Davranış

- EİDS kilidi (`EIDS_PUBLISH_UNLOCK`) **açık kalır**.
- `emlak` / `vasita` ağacında create → `status=draft`, `postedAt`/`expiresAt` null.
- Diğer kategoriler → eskisi gibi `active` + 15 gün.
- Taslak: public listeler / sitemap / SEO / anonymous GET gizlenir; sahip + admin görür.
- Admin approve / renew / resale / status→active: EİDS kilidi engeller.
- İlanlarım → “Onay bekleyen” sekmesinde taslaklar + EİDS mesajı.

## Sonraki aşama

Gerçek EİDS SSO + yetki API sonrası draft → active geçişi (ayrı onay).
