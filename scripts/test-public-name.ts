import assert from "node:assert/strict";
import {
  listingSellerLabel,
  maskPersonName,
  publicAccountName,
  reviewAuthorLabel,
  verifiedBusinessName,
} from "../src/lib/publicName";

const cases: [string, string][] = [
  ["Ekrem Tabik", "Ekrem T."],
  ["Mehmet Ali Yılmaz", "Mehmet Ali Y."],
  ["  ayşe   öztürk ", "ayşe Ö."],
  ["Selim İnce", "Selim İ."],
  ["Zeynep ışık", "Zeynep I."],
  ["ekrem1987", "ekrem1987"],
  ["Ekrem T.", "Ekrem T."],
  ["Mehmet Ali Y.", "Mehmet Ali Y."],
  ["", ""],
];
for (const [input, expected] of cases) assert.equal(maskPersonName(input), expected, input);

assert.equal(publicAccountName({ displayName: "Ekrem Tabik", username: "ekrem" }), "Ekrem T.");
assert.equal(publicAccountName({ displayName: "", username: "ekrem1987" }), "ekrem1987");

const selfDeclared = { displayName: "Ekrem Tabik", username: "ekrem", businessName: "Tabik Otomotiv Ltd. Şti.", businessVerifiedAt: null };
assert.equal(verifiedBusinessName(selfDeclared), null);
assert.equal(publicAccountName(selfDeclared), "Ekrem T.");

const verified = { ...selfDeclared, businessVerifiedAt: new Date() };
assert.equal(publicAccountName(verified), "Tabik Otomotiv Ltd. Şti.");

assert.equal(listingSellerLabel({ sellerName: "Selim Demir" }), "Selim D.");
assert.equal(listingSellerLabel({ sellerName: "Ankara Oto Galeri A.Ş.", sellerBusiness: true }), "Ankara Oto Galeri A.Ş.");
assert.equal(reviewAuthorLabel({ authorName: "Merve Kaya" }), "Merve K.");
assert.equal(reviewAuthorLabel({ authorName: "Kaya Emlak", authorBusiness: true }), "Kaya Emlak");

console.log(`public-name: ${cases.length + 9} checks passed`);
