/**
 * Static checks for the Android (Trusted Web Activity) project in /android and the web side of App Links.
 * Does not need the Android SDK; the Gradle build and on-device tests are separate.
 *
 *   npx tsx scripts/test-android.ts
 *   ANDROID_TEST_BASE=http://localhost:3013 npx tsx scripts/test-android.ts   (+ HTTP check of assetlinks.json)
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { ANDROID_PACKAGE, assetLinks, validFingerprints } from "../src/data/androidApp";

const ROOT = process.cwd();
const A = path.join(ROOT, "android");
const BASE = process.env.ANDROID_TEST_BASE ?? "";
const results: boolean[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(4)} ${name}${detail ? `  — ${detail}` : ""}`);
}
const read = (p: string) => readFileSync(path.join(A, p), "utf8");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    if (n === "build" || n === ".gradle") return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function pngSize(file: string) {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), png: b.toString("ascii", 1, 4) === "PNG" };
}

function project() {
  const gradle = read("app/build.gradle.kts");
  const manifest = read("app/src/main/AndroidManifest.xml");
  const strings = read("app/src/main/res/values/strings.xml");
  const launcher = read("app/src/main/java/com/alsatport/app/LauncherActivity.java");
  const policy = read("app/src/main/java/com/alsatport/app/UrlPolicy.java");

  const appId = gradle.match(/applicationId = "([^"]+)"/)?.[1];
  const ns = gradle.match(/namespace = "([^"]+)"/)?.[1];
  check("G1", `package name is ${ANDROID_PACKAGE} everywhere`,
    appId === ANDROID_PACKAGE && ns === ANDROID_PACKAGE && /^package com\.alsatport\.app;/m.test(launcher) && !/applicationIdSuffix/.test(gradle),
    `applicationId=${appId} namespace=${ns}`);
  const target = Number(gradle.match(/targetSdk = (\d+)/)?.[1]);
  const compile = Number(gradle.match(/compileSdk = (\d+)/)?.[1]);
  check("G2", "targetSdk/compileSdk ≥ 36 (Google Play, from 31 Aug 2026)", target >= 36 && compile >= target, `target=${target} compile=${compile}`);
  check("G3", "release build minified; signing only from git-ignored file or CI env", /isMinifyEnabled = true/.test(gradle) && /keystore\.properties/.test(gradle) && !/storePassword = "/.test(gradle));
  check("G4", "uses android-browser-helper (TWA), no WebView client code",
    /androidbrowserhelper:androidbrowserhelper:\d/.test(gradle) && !walk(path.join(A, "app", "src")).some((f) => f.endsWith(".java") && /WebView/.test(readFileSync(f, "utf8"))));

  check("M1", "no <uses-permission> declared", !/<uses-permission/.test(manifest));
  check("M2", "cleartext HTTP disabled", /usesCleartextTraffic="false"/.test(manifest) && /cleartextTrafficPermitted="false"/.test(read("app/src/main/res/xml/network_security_config.xml")));
  check("M3", "backups off (app keeps no user data)", /allowBackup="false"/.test(manifest));
  const verified = manifest.match(/<intent-filter android:autoVerify="true">([\s\S]*?)<\/intent-filter>/)?.[1] ?? "";
  const schemes = [...verified.matchAll(/android:scheme="([^"]+)"/g)].map((m) => m[1]);
  const hosts = [...verified.matchAll(/android:host="([^"]+)"/g)].map((m) => m[1]);
  check("M4", "App Links: https + alsatport.com only, BROWSABLE", schemes.join() === "https" && hosts.join() === "alsatport.com" && /BROWSABLE/.test(verified));
  const browsableFilters = manifest.match(/<intent-filter[^>]*>[\s\S]*?<\/intent-filter>/g)?.filter((f) => /BROWSABLE/.test(f)) ?? [];
  check("M5", "no unverified/custom-scheme deep link filters", browsableFilters.length === 1);
  check("M6", "fallback is Custom Tabs, not WebView", /FALLBACK_STRATEGY"\s*android:value="customtabs"/.test(manifest));
  check("M7", "start URL is https://alsatport.com/", /<string name="start_url"[^>]*>https:\/\/alsatport\.com\/<\/string>/.test(strings) && /DEFAULT_URL"\s*android:value="@string\/start_url"/.test(manifest));
  check("M8", "asset statement points to https://alsatport.com", /\\"site\\": \\"https:\/\/alsatport\.com\\"/.test(strings) && /android:name="asset_statements"/.test(manifest));
  check("M9", "FileProvider not exported, splash path only",
    /FileProvider"[\s\S]*?android:exported="false"/.test(manifest) && (read("app/src/main/res/xml/filepaths.xml").match(/-path /g) ?? []).length === 1);
  check("M10", "launcher only opens https://alsatport.com links (UrlPolicy)",
    /getLaunchingUrl\(\)[\s\S]*UrlPolicy\.launchUrl/.test(launcher) && /"https"\.equals/.test(policy) && /getRawUserInfo\(\) == null/.test(policy) && /getPort\(\) == -1/.test(policy));

  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 } as const;
  const bad: string[] = [];
  for (const [d, k] of Object.entries(dens)) {
    for (const [file, dp] of [["ic_launcher.png", 48], ["ic_launcher_round.png", 48], ["ic_launcher_foreground.png", 108]] as const) {
      const p = path.join(A, "app/src/main/res", `mipmap-${d}`, file);
      const want = Math.round(dp * k);
      if (!existsSync(p)) bad.push(`${d}/${file} missing`);
      else {
        const s = pngSize(p);
        if (!s.png || s.w !== want || s.h !== want) bad.push(`${d}/${file} ${s.w}x${s.h}≠${want}`);
      }
    }
    if (!existsSync(path.join(A, "app/src/main/res", `drawable-${d}`, "splash.png"))) bad.push(`${d}/splash missing`);
  }
  check("R1", "launcher, adaptive and splash images at every density", bad.length === 0, bad.slice(0, 3).join(", "));
  const icon = pngSize(path.join(A, "play-store/icon-512.png"));
  const feature = pngSize(path.join(A, "play-store/feature-graphic-1024x500.png"));
  check("R2", "Play Store icon 512×512 and feature graphic 1024×500", icon.w === 512 && icon.h === 512 && feature.w === 1024 && feature.h === 500);

  const secrets = walk(A).filter((f) => /\.(jks|keystore|p12|pem|apk|aab)$|keystore\.properties$/i.test(f));
  check("S1", "no keystore, signing file, APK or AAB in /android", secrets.length === 0, secrets.join(","));
  const ignore = read(".gitignore");
  check("S2", "android/.gitignore blocks keystores, signing config and build output",
    ["*.jks", "*.keystore", "keystore.properties", "*.apk", "*.aab", "local.properties", "build/"].every((p) => ignore.includes(p)));
  const tracked = execSync("git ls-files android", { cwd: ROOT, encoding: "utf8" }).split("\n").filter((f) => /\.(jks|keystore|p12|pem|apk|aab)$|keystore\.properties$/i.test(f));
  check("S3", "git tracks no signing material under android/", tracked.length === 0, tracked.join(","));
  check("S4", "Vercel deploys skip /android", /^android\/?$/m.test(readFileSync(path.join(ROOT, ".vercelignore"), "utf8")));
}

function web() {
  check("W1", "assetlinks: no statement without a real fingerprint", assetLinks([]) === null && assetLinks(["not-a-fingerprint", "AB:CD"]) === null);
  const fp = Array.from({ length: 32 }, (_, i) => (i * 7 + 16).toString(16).padStart(2, "0").slice(-2)).join(":");
  const st = assetLinks([fp.toLowerCase(), fp]);
  check("W2", "assetlinks: normalises, de-duplicates and targets the package",
    !!st && st[0]!.target.package_name === ANDROID_PACKAGE && st[0]!.target.sha256_cert_fingerprints.length === 1 &&
      st[0]!.target.sha256_cert_fingerprints[0] === fp.toUpperCase() && st[0]!.relation[0] === "delegate_permission/common.handle_all_urls");
  check("W3", "fingerprint format is strict (32 hex pairs)", validFingerprints([fp + ":00", fp.replace(/:/g, "")]).length === 0);
}

async function http() {
  if (!BASE) return;
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("ANDROID_TEST_BASE must be a local server.");
  const r = await fetch(`${BASE}/.well-known/assetlinks.json`, { redirect: "manual" });
  const expected = assetLinks() ? 200 : 404;
  check("H1", `/.well-known/assetlinks.json answers ${expected} (no redirect)`, r.status === expected, String(r.status));
}

async function main() {
  project();
  web();
  await http();
  const failed = results.filter((p) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) process.exit(1);
}
main();
