import { Download } from "lucide-react";
import { BRAND_KIT, BRAND_KIT_SLOGAN } from "@/lib/brandKit";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "AlsatPort Marka Kiti · Logo ve Basın Materyalleri",
  description:
    "AlsatPort’un resmi logo, ikon ve marka materyallerini buradan indirebilirsiniz. Basın, iş ortakları ve içerik üreticileri için logo kullanım kuralları.",
  path: "/marka-kiti",
});

const RULES = [
  "Logonun oranlarını değiştirmeyin.",
  "Logoyu eğmeyin, esnetmeyin veya deforme etmeyin.",
  "Marka renklerini değiştirmeyin.",
  "Logonun okunabilirliğini bozacak arka planlar kullanmayın.",
  "Logoyu, AlsatPort’un bir kullanıcıyı, işletmeyi, ürünü veya hizmeti resmi olarak desteklediği izlenimini verecek şekilde kullanmayın.",
];

export default function BrandKitPage() {
  return (
    <div className="bk-page">
      <header className="bk-hero">
        <p className="bk-kicker">Basın ve iş ortakları</p>
        <h1>AlsatPort Marka Kiti</h1>
        <p>AlsatPort’un resmi logo, ikon ve marka materyallerini buradan indirebilirsiniz.</p>
      </header>

      <section aria-labelledby="bk-assets">
        <h2 id="bk-assets" className="bk-h2">
          Logo ve ikonlar
        </h2>
        <ul className="bk-grid">
          {BRAND_KIT.map((item) => (
            <li key={item.id} className="bk-card">
              <div className={`bk-preview is-${item.surface} is-${item.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.preview} alt={`AlsatPort ${item.title}`} loading="lazy" decoding="async" />
              </div>
              <div className="bk-body">
                <h3>{item.title}</h3>
                <p>{item.note}</p>
                <p className="bk-meta">
                  {[...new Set(item.files.map((f) => f.type))].join(" · ")} · {item.size}
                </p>
                <div className="bk-actions">
                  {item.files.map((f) => (
                    <a key={f.src} href={f.src} download={f.download} className="bk-btn" title={f.download}>
                      <Download aria-hidden="true" />
                      {f.label}
                    </a>
                  ))}
                </div>
                <p className="bk-file">{item.files.map((f) => f.download).join(", ")}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="bk-two">
        <section className="bk-panel" aria-labelledby="bk-rules">
          <h2 id="bk-rules" className="bk-h2">
            Logo kullanım kuralları
          </h2>
          <ul className="bk-rules">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="bk-panel" aria-labelledby="bk-info">
          <h2 id="bk-info" className="bk-h2">
            Marka bilgileri
          </h2>
          <dl className="bk-info">
            <div>
              <dt>Marka</dt>
              <dd>AlsatPort</dd>
            </div>
            <div>
              <dt>Web sitesi</dt>
              <dd>
                <a href="https://alsatport.com">alsatport.com</a>
              </dd>
            </div>
            <div>
              <dt>Slogan</dt>
              <dd>{BRAND_KIT_SLOGAN}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
