import {
  LEGAL_ADDRESS,
  LEGAL_BRAND,
  LEGAL_CONTROLLER_MISSING,
  LEGAL_CONTROLLER_READY,
  LEGAL_CONTROLLER_WARNING,
  LEGAL_DATA_CONTROLLER_NAME,
  LEGAL_DOMAIN,
  LEGAL_PRIVACY_EMAIL,
  legalUpdatedLabel,
} from "@/data/legal";
import { legalProcessors } from "@/lib/legalServices";

export function Mail({ to }: { to: string }) {
  return (
    <a className="font-semibold text-lime hover:underline" href={`mailto:${to}`}>
      {to}
    </a>
  );
}

export function LegalHeader({ kicker, title, compact }: { kicker: string; title: string; compact?: boolean }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{kicker}</p>
      <h1 className={`mt-1 font-extrabold ${compact ? "text-xl" : "text-2xl md:text-3xl"}`}>{title}</h1>
      <p className="mt-2 text-xs text-muted">Son güncelleme: {legalUpdatedLabel()}</p>
    </>
  );
}

export function LegalToc({ items }: { items: [string, string][] }) {
  return (
    <nav className="legal-toc" aria-label="İçindekiler">
      {items.map(([href, label]) => (
        <a key={href} href={href} className="chip">
          {label}
        </a>
      ))}
    </nav>
  );
}

/** Real controller identity from env; never falls back to an invented legal entity. */
export function ControllerIdentity() {
  return (
    <>
      <ul>
        <li>
          <strong>Veri sorumlusu:</strong>{" "}
          {LEGAL_DATA_CONTROLLER_NAME || `${LEGAL_BRAND} (${LEGAL_DOMAIN}) işletmecisi`}
        </li>
        {LEGAL_ADDRESS ? (
          <li>
            <strong>Adres:</strong> {LEGAL_ADDRESS}
          </li>
        ) : null}
        <li>
          <strong>İletişim ve KVKK başvuruları:</strong> <Mail to={LEGAL_PRIVACY_EMAIL} />
        </li>
      </ul>
      {!LEGAL_CONTROLLER_READY && process.env.NODE_ENV !== "production" ? (
        <p className="legal-warn" role="note">
          {LEGAL_CONTROLLER_WARNING} Eksik: {LEGAL_CONTROLLER_MISSING.join(", ")}
        </p>
      ) : null}
    </>
  );
}

export function ProcessorTable() {
  const rows = legalProcessors();
  if (!rows.length) {
    return <p>Bu sürümde kişisel veri aktarılan harici bir hizmet sağlayıcı yapılandırılmamıştır.</p>;
  }
  return (
    <div className="legal-table-wrap">
      <table className="legal-table">
        <thead>
          <tr>
            <th>Alıcı</th>
            <th>Amaç</th>
            <th>Aktarılan veri</th>
            <th>Konum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.purpose}</td>
              <td>{r.data}</td>
              <td>{r.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
