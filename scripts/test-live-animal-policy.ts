import {
  applicableListingPolicies,
  isBlockedLiveAnimalListing,
  isPetsCategoryId,
  moderateListingDraft,
} from "../src/lib/liveAnimalPolicy";
import { findCategory, lookupCategory } from "../src/data/categories";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const car = moderateListingDraft({
  title: "Satılık BMW 320i M Sport",
  description: "Hasarsız, fiyat pazarlık payı vardır.",
  categoryId: "vasita-otomobil",
});
assert(!car.blocked, `vasita-otomobil must pass, got ${car.reason}`);
assert(applicableListingPolicies("vasita-otomobil").length === 0, "vasita should have no live-animal policy");

const estate = moderateListingDraft({
  title: "Satılık Daire 3+1 Beşiktaş",
  description: "Krediye uygun daire.",
  categoryId: "emlak-konut-satilik-daire",
});
assert(!estate.blocked, `emlak must pass, got ${estate.reason}`);

const phone = moderateListingDraft({
  title: "Satılık iPhone 15 Pro Max",
  description: "Kutulu, faturası mevcut.",
  categoryId: "shopping-phone",
});
assert(!phone.blocked, `electronics must pass, got ${phone.reason}`);

const jobs = moderateListingDraft({
  title: "Satış danışmanı arıyoruz",
  description: "Mağaza elemanı.",
  categoryId: "jobs",
});
assert(!jobs.blocked, `jobs must pass, got ${jobs.reason}`);

assert(!isPetsCategoryId("vasita-otomobil"), "car id is not pets");
assert(isPetsCategoryId("pets"), "pets root");
assert(isPetsCategoryId("pets-food"), "pets-food");
assert(isPetsCategoryId("pets-home"), "banned live cat still pets tree");

const bannedCat = moderateListingDraft({
  title: "Mama kabı",
  description: "Aksesuar",
  categoryId: "pets-home",
});
assert(bannedCat.blocked && bannedCat.reason === "mod.animal.cat", "banned live-animal category must stay blocked");

const liveSale = moderateListingDraft({
  title: "Satılık yavru kedi",
  description: "Damızlık british",
  categoryId: "pets",
});
assert(liveSale.blocked, "live kitten sale in pets must block");

const accessory = moderateListingDraft({
  title: "Satılık kedi maması ve tasma",
  description: "Royal canin mama, gezdirme tasması",
  categoryId: "pets-food",
});
assert(!accessory.blocked, `pet accessory must pass, got ${accessory.reason}`);

assert(
  !isBlockedLiveAnimalListing({
    title: "Satılık Peugeot 3008",
    subtitle: "Vasıta · İstanbul / Kadıköy",
    description: "Otomatik, benzin, hatasız.",
    categoryId: "vasita-otomobil",
    images: ["/photo.jpg"],
  }),
  "listing helper must not block cars",
);

assert(
  !moderateListingDraft({
    title: "Satılık yavru kedi",
    description: "Damızlık",
    categoryId: "vasita-otomobil",
  }).blocked,
  "pets wording on a car category must not use pet policy",
);

assert(lookupCategory("vasita-otomobil")?.id === "vasita-otomobil", "car lookup stays otomobil");
assert(!lookupCategory("pets-home"), "removed live-animal node is not selectable");
assert(findCategory("pets-home")?.id === "pets", "browse remap of banned live-animal id stays pets hub");
assert(lookupCategory("pets-food")?.id === "pets-food", "pet accessory node stays itself");
assert(lookupCategory("phones")?.id === "shopping-phone", "phone alias canonicalizes");

console.log("live-animal policy tests passed");
