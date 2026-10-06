import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="360">
  <text x="50.3%" y="58%" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="132" font-weight="600" letter-spacing="10" fill="#111111" fill-opacity="0.45">alsatport.com</text>
  <text x="50%" y="56%" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="132" font-weight="600" letter-spacing="10" fill="#f4f4f4">alsatport.com</text>
</svg>`;

const out = path.join("src", "lib", "storage", "alsatport-watermark.png");
await sharp(Buffer.from(svg)).png().toFile(out);
const meta = await sharp(out).metadata();
console.log(JSON.stringify({ out, width: meta.width, height: meta.height }));
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["scripts/embed-listing-watermark.mjs"], { stdio: "inherit" });
  child.on("exit", (code) => (code === 0 ? resolve(null) : reject(new Error(`embed exit ${code}`))));
});
