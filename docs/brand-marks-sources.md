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
| Wikimedia Commons **PD-textlogo** / **PD-shape** | Clears **copyright** for simple geometry/text only. Commons also tags many as **Trademarked** — PD-textlogo is **not** automatic permission for commercial trademark use. We use marks nominatively (filter/form identification only). | BYD, Chery, Beko, Arçelik, Michelin, Bridgestone, Realme, Lexus, AGV, Alpinestars, Anker, Continental, Daihatsu, Dodge, Focal, Olympus, Osram, Pirelli, Saab, Seiko, SKF, Thule, … |
| Hand-authored simplified ID marks | Original simple geometry for 24×24 UI chips when no trusted Commons SVG was available | Togg, Alpine (cars), Goodyear, Komatsu, Liebherr, Abarth, Mercedes-Benz |
| Official brand asset (PD-textlogo equivalent) | Cited on Commons as source; same nominative use | Anker (`assets.anker.com.cn` Innovations wordmark) |

We do **not** use:

- Wrong-brand icons (e.g. Alpine Linux for Alpine cars, Toggl for Togg, Commons `GMC_logo.svg` = Greater Manchester Council ≠ GM GMC; Alfa Romeo *model* wordmarks like “4C” ≠ brand badge)
- Simple Icons lookalikes that map to the wrong company (AnkerMake, Pioneer DJ, Taco Bell, Goldman Sachs)
- Hotlinked third-party logo CDNs
- Complex copyrighted artwork without a clear reuse basis
- A Commons filename that matches a catalog brand without verifying the file description
- CC BY-SA logos that would force share-alike on the product UI without a clear attribution surface (e.g. TCL-Global-logo.svg)

## Fallback

If neither Simple Icons nor a manual file resolves, `BrandMark` renders two-letter
initials. No broken `<img>` placeholders.

## 63 letter-fallback research (2026-10-18)

Started from 63 catalog brands on letter chips. After license-safe Commons / official SVG intake: **14 → logo**, **49 remain fallback**.

| Kept as letter | Why |
|----------------|-----|
| Alfa Romeo | Commons SVGs are model wordmarks (4C/MiTo/…), not the marque badge |
| GMC | Prior wrong-file trap; GM mark not verified safely for this pass |
| Fabrikasyon, Orijinal | Generic catalog labels, not trademarks |
| Hidromek, Lassa, Petlas, Tofaş, Baseus, … | No trusted PD-textlogo SVG found / rate-limit blocked download / unverified |
| Bell, Sachs, Pioneer, … | Commons/SI hits are wrong entities (helmet≠Taco Bell, Sachs≠Goldman, Pioneer≠Pioneer DJ) |
| Jaguar, Land Rover, Lincoln, Genesis, Rolex, … | Badge/artwork may exceed PD-textlogo; deferred rather than risk wrong mark |
| Helmet/gear niche (Arai, Shoei, HJC, …) | No clear PD-textlogo SVG verified this pass |

## Regeneration

```bash
npm run build:brand-marks
npm run test:brand-marks
```
