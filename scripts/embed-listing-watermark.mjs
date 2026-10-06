import fs from "node:fs";

const b = fs.readFileSync("src/lib/storage/alsatport-watermark.png").toString("base64");
const src = `export const LISTING_WATERMARK_PNG_BASE64 =\n  "${b}";\n`;
fs.writeFileSync("src/lib/storage/listingWatermarkAsset.ts", src);
console.log("chars", b.length, "file", src.length);
