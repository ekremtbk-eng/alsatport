import fs from "node:fs";
import assert from "node:assert/strict";
import { neighborhoodsOf, resolveMemberPlace, turkeyPlaceCoverage } from "../src/lib/geo/neighborhoods";
import { marketingChoices } from "../src/lib/privacy/marketingChoices";

const coverage = turkeyPlaceCoverage();
assert.equal(coverage.cities, 81, "81 provinces");
assert.equal(coverage.missing.length, 0, coverage.missing.join(", "));
assert.equal(coverage.districts, coverage.matched);

const cankaya = neighborhoodsOf("Ankara", "Çankaya");
assert.ok(cankaya.length > 20, "Çankaya neighborhoods");
assert.equal(resolveMemberPlace("Ankara", "Çankaya", "Yok Mah.") , null);
assert.ok(resolveMemberPlace("Ankara", "Çankaya", cankaya[0]!)?.neighborhood === cankaya[0]);
assert.equal(resolveMemberPlace("Ankara", "Kadıköy", cankaya[0]!), null);

const agri = neighborhoodsOf("Ağrı", "Merkez");
assert.ok(agri.length > 0, "Merkez maps to il merkezi");
assert.equal(neighborhoodsOf("Ankara", "Olmayan").length, 0);

const emailOnly = marketingChoices({ marketing: true });
assert.equal(emailOnly.email, true);
assert.equal(emailOnly.sms, false);
const smsOnly = marketingChoices({ marketingEmail: false, marketingSms: true });
assert.equal(smsOnly.email, false);
assert.equal(smsOnly.sms, true);
assert.deepEqual(marketingChoices({}), { email: false, sms: false });

const oauth = fs.readFileSync("src/lib/oauth/complete.ts", "utf8");
const marker = oauth.indexOf("const existing = await findUserByEmail");
const existing = oauth.slice(marker, oauth.indexOf("const name = identity.name.trim()", marker));
assert.match(existing, /linkRequired/);
assert.doesNotMatch(existing, /saveUser/);

const phoneStart = fs.readFileSync("src/app/api/account/phone/start/route.ts", "utf8");
assert.match(phoneStart, /smsReady\(\)/);
assert.doesNotMatch(phoneStart, /sendOtpEmail/);
const phoneConfirm = fs.readFileSync("src/app/api/account/phone/confirm/route.ts", "utf8");
assert.match(phoneConfirm, /verifyEmailOtp\(auth\.user\.id, otp, "phone", "sms"\)/);
assert.match(phoneConfirm, /smsReady\(\)/);

console.log(`member form ok: ${coverage.cities} cities, ${coverage.districts} districts, ${cankaya.length} Çankaya neighborhoods`);
