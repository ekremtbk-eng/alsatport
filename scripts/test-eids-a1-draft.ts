/**
 * A1 unit checks — EİDS draft save vs active publish lock.
 * Run: npx tsx --conditions=react-server scripts/test-eids-a1-draft.ts
 */
import {
  eidsBlocksActivePublish,
  eidsRequiresDraftSave,
  isEidsPublishLockActive,
  EIDS_PUBLISH_UNLOCK_TOKEN,
} from "../src/lib/listings/eidsPublishLock";
import { isLiveRow, liveListingWhere } from "../src/lib/listings/lifecycle";
import { isPublicListing } from "../src/lib/categoryCounts";
import type { Listing } from "../src/data/store";

let failed = 0;
function check(id: string, label: string, ok: boolean, detail = "") {
  if (ok) console.log(`PASS  ${id}  ${label}`);
  else {
    failed += 1;
    console.error(`FAIL  ${id}  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

delete process.env.EIDS_PUBLISH_UNLOCK;
check("L1", "publish lock active by default", isEidsPublishLockActive());
check("L2", "vasita requires draft save", eidsRequiresDraftSave("vasita-otomobil"));
check("L3", "emlak requires draft save", eidsRequiresDraftSave("emlak-konut"));
check("L4", "shopping does not require draft", !eidsRequiresDraftSave("shopping"));
check("L5", "active publish still blocked for vasita", eidsBlocksActivePublish("vasita-otomobil"));
check(
  "L6",
  "draft→active still blocked",
  eidsBlocksActivePublish("vasita-otomobil", { status: "draft", categoryId: "vasita-otomobil" }),
);
check(
  "L7",
  "already-active gated content edit allowed",
  !eidsBlocksActivePublish("vasita-otomobil", { status: "active", categoryId: "vasita-otomobil" }),
);

const draftListing: Listing = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Draft car",
  subtitle: "",
  price: 1,
  categoryId: "vasita-otomobil",
  city: "İstanbul",
  district: "Kadıköy",
  images: ["https://example.com/a.jpg"],
  description: "x",
  sellerId: "u",
  sellerName: "T",
  sellerAvatar: "",
  sellerVerified: false,
  createdAt: "şimdi",
  views: 0,
  featured: false,
  vip: false,
  status: "draft",
  specs: [],
  listingNo: "DRAFT-1",
};
check("P1", "draft is not public listing", !isPublicListing(draftListing));
check(
  "P2",
  "draft row is not live",
  !isLiveRow({ status: "draft", expiresAt: null, deletedAt: null }),
);
const where = liveListingWhere();
check("P3", "liveListingWhere status is active only", (where as { status?: string }).status === "active");

process.env.EIDS_PUBLISH_UNLOCK = EIDS_PUBLISH_UNLOCK_TOKEN;
check("U1", "unlock disables draft-save requirement", !eidsRequiresDraftSave("vasita-otomobil"));
delete process.env.EIDS_PUBLISH_UNLOCK;

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nA1 draft unit checks passed");
