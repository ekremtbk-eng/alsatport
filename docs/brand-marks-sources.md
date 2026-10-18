# Brand mark sources & licensing

## Simple Icons (CC0 1.0)

Primary source for automotive, electronics, and tech brands available in the
[`simple-icons`](https://simpleicons.org/) package. Icons are CC0; **trademarks
remain with their owners**. Used for nominative brand identification in filters
and forms only.

Notable aliases:

- **Yamaha** → `yamahamotorcorporation` (motorcycles / vehicles — not Yamaha audio)
- **Alpine (cars)** → never mapped to `alpinelinux`
- **MSI**, **DJI**, **Infiniti** → native Simple Icons slugs

## Manual marks (`public/brand-marks/*.svg`)

Built by `scripts/optimize-manual-brand-marks.ts` from
`scripts/brand-mark-sources/`.

| Kind | License / basis | Examples |
|------|-----------------|----------|
| Wikimedia Commons **PD-textlogo** / **PD-shape** | Public domain for copyright (simple geometry/text); trademarks still apply | BYD, Chery, Beko, Arçelik, Michelin, Bridgestone, Realme, Lexus, … |
| Hand-authored simplified ID marks | Original simple geometry for 24×24 UI chips when no trusted Commons SVG was available | Togg, Alpine (cars), Goodyear, Komatsu, Liebherr, Abarth |

We do **not** use:

- Wrong-brand icons (e.g. Alpine Linux for Alpine cars, Toggl for Togg)
- Hotlinked third-party logo CDNs
- Complex copyrighted artwork without a clear reuse basis

## Fallback

If neither Simple Icons nor a manual file resolves, `BrandMark` renders two-letter
initials. No broken `<img>` placeholders.

## Regeneration

```bash
npm run build:brand-marks
npm run test:brand-marks
```
