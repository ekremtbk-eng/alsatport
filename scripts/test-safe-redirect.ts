import { safeNextPath } from "../src/lib/oauth/nextPath";
import { safeNextPath as clientSafeNextPath } from "../src/lib/profile";

const server: [string, string][] = [
  ["/ilan-ver?x=1", "/ilan-ver?x=1"],
  ["//evil.com", "/profil"],
  ["/\\evil.com", "/profil"],
  ["/\tevil.com", "/profil"],
  ["/\t/evil.com", "/profil"],
  ["/\n/evil.com", "/profil"],
  ["https://evil.com", "/profil"],
  ["javascript:alert(1)", "/profil"],
  ["/%2F%2Fevil.com", "/%2F%2Fevil.com"],
  ["/../../x", "/x"],
];
const client: [string, string][] = [
  ["/mesajlar", "/mesajlar"],
  ["//evil.com", "/ilan-ver"],
  ["/\\evil.com", "/ilan-ver"],
  ["/\t/evil.com", "/ilan-ver"],
  ["https://evil.com", "/ilan-ver"],
];

let bad = 0;
for (const [input, want] of server) {
  const got = safeNextPath(input);
  if (got !== want) bad++;
  console.log(got === want ? "PASS" : "FAIL", "server", JSON.stringify(input), "->", got);
}
for (const [input, want] of client) {
  const got = clientSafeNextPath(input);
  if (got !== want) bad++;
  console.log(got === want ? "PASS" : "FAIL", "client", JSON.stringify(input), "->", got);
}
process.exit(bad ? 1 : 0);
