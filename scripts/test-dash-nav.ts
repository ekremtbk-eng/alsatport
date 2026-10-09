/**
 * Profile "İlan Yönetimi" menu state per corporate status (pure, no server):
 *
 *   npx tsx scripts/test-dash-nav.ts
 */
import { MESSAGES } from "../src/i18n/messages";
import { businessNavState } from "../src/lib/business/navState";
import type { OwnerBusiness } from "../src/lib/business/shared";
import { EMPTY_FIRM_EXTRAS } from "../src/lib/business/firmProfile";

const results: { name: string; pass: boolean }[] = [];
function check(name: string, pass: boolean) {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
}

function biz(status: OwnerBusiness["status"], slug = "ornek-magaza"): OwnerBusiness {
  return {
    slug,
    status,
    name: "Örnek",
    contactName: "",
    companyType: "sahis",
    taxOffice: "",
    taxNumber: "",
    categoryId: "",
    city: "",
    district: "",
    description: "",
    website: "",
    email: "",
    phone: "",
    logoUrl: "",
    coverUrl: "",
    rejectReason: "",
    submittedAt: 0,
    extras: EMPTY_FIRM_EXTRAS,
  };
}

const tr = (key: string) => MESSAGES.tr[key] ?? `MISSING:${key}`;

const loading = businessNavState(undefined);
check("loading: neutral label, no badge", loading.labelKey === "dash.biz" && !loading.badgeKey && loading.tone === "neutral");
check("loading: no urgent, no store", !loading.urgentHref && !loading.storeHref);

const none = businessNavState(null);
check("individual: 'Kurumsal Hesaba Geç' + 'Ücretsiz'", tr(none.labelKey) === "Kurumsal Hesaba Geç" && tr(none.badgeKey!) === "Ücretsiz");
check("individual: links to /kurumsal-hesap", none.href === "/kurumsal-hesap");
check("individual: no urgent, no store, not verified", !none.urgentHref && !none.storeHref && none.tone !== "verified");

const pending = businessNavState(biz("pending"));
check("pending: 'Kurumsal Başvuru' + 'İnceleniyor'", tr(pending.labelKey) === "Kurumsal Başvuru" && tr(pending.badgeKey!) === "İnceleniyor");
check("pending: no urgent, no store, not verified", !pending.urgentHref && !pending.storeHref && pending.tone !== "verified");
check("pending: links to /kurumsal-hesap", pending.href === "/kurumsal-hesap");

const approved = businessNavState(biz("approved"));
check("approved: 'İşletme Paneli' + 'Doğrulanmış'", tr(approved.labelKey) === "İşletme Paneli" && tr(approved.badgeKey!) === "Doğrulanmış");
check("approved: links to /isletme-paneli", approved.href === "/isletme-paneli");
check("approved: store link is own /magaza/[slug]", approved.storeHref === "/magaza/ornek-magaza");
check("approved: urgent shortcut opens the existing form", approved.urgentHref === "/ilan-ver?acil=1");
check("approved: verified tone", approved.tone === "verified");

const rejected = businessNavState(biz("rejected"));
check("rejected: 'Kurumsal Başvuru' + 'Güncelle'", tr(rejected.labelKey) === "Kurumsal Başvuru" && tr(rejected.badgeKey!) === "Güncelle");
check("rejected: no urgent, no store, not verified", !rejected.urgentHref && !rejected.storeHref && rejected.tone !== "verified");
check("rejected: links to /kurumsal-hesap", rejected.href === "/kurumsal-hesap");

const revoked = businessNavState(biz("revoked"));
check("revoked: 'Kurumsal Başvuru' + 'Yeniden Başvur'", tr(revoked.labelKey) === "Kurumsal Başvuru" && tr(revoked.badgeKey!) === "Yeniden Başvur");
check("revoked: no urgent, no store, not verified", !revoked.urgentHref && !revoked.storeHref && revoked.tone !== "verified");
check("revoked: never links to /isletme-paneli", revoked.href === "/kurumsal-hesap");

const odd = businessNavState({ ...biz("approved"), status: "superadmin" as OwnerBusiness["status"] });
check("unknown status: treated as neutral, no corporate links", odd.tone === "neutral" && !odd.urgentHref && !odd.storeHref);

for (const slug of ["../admin", "a/b", "javascript:alert(1)", "", "ÖRNEK", "a--b-"]) {
  check(`approved with bad slug ${JSON.stringify(slug)}: no store link`, !businessNavState(biz("approved", slug)).storeHref);
}

const keys = ["dash.nav.new", "dash.nav.urgent", "dash.nav.bizApp", "dash.nav.store", "dash.badge.free", "dash.badge.verified", "dash.badge.update", "dash.badge.reapply"];
for (const k of keys) {
  const row = [MESSAGES.tr[k], MESSAGES.en[k], MESSAGES.de[k], MESSAGES.ar[k], MESSAGES.ru[k]];
  check(`i18n ${k}: 5 non-empty translations`, row.every((s) => typeof s === "string" && s.trim().length > 0));
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
