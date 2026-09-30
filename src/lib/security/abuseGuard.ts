import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { clientIp } from "@/lib/security/rateLimit";
import { COOKIE_DEVICE } from "@/lib/security/cookies";
import { sha256Secret } from "@/lib/security/hash";
import { FREE_LISTING_QUOTA } from "@/lib/listingQuota";

type AbuseRow = {
  userId: string;
  ipHash: string;
  fpHash: string;
  didHash: string;
  at: number;
};

const g = globalThis as unknown as { __apAbuse?: AbuseRow[] };
if (!g.__apAbuse) g.__apAbuse = [];

function filePath() {
  return path.join(process.cwd(), "data", "abuse-signals.json");
}

let loaded = false;

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await fs.readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw) as AbuseRow[];
    if (Array.isArray(parsed)) g.__apAbuse = parsed;
  } catch {
    g.__apAbuse = g.__apAbuse ?? [];
  }
}

async function persist() {
  try {
    await fs.mkdir(path.dirname(filePath()), { recursive: true });
    await fs.writeFile(filePath(), JSON.stringify(g.__apAbuse, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

async function sha256(value: string) {
  return sha256Secret("abuse", value.trim().toLowerCase());
}

function headerFp(req: Request) {
  const raw = req.headers.get("x-device-fp") ?? "";
  return raw.replace(/[^a-f0-9]/gi, "").slice(0, 64);
}

export async function signalsFromRequest(req: Request) {
  const jar = await cookies();
  const did = jar.get(COOKIE_DEVICE)?.value ?? "";
  const ip = clientIp(req);
  const fp = headerFp(req);
  const [ipHash, fpHash, didHash] = await Promise.all([
    sha256(ip || "unknown"),
    sha256(fp || "none"),
    sha256(did || "none"),
  ]);
  return { ipHash, fpHash, didHash, hasFp: Boolean(fp), hasDid: Boolean(did) };
}

export async function freeQuotaForNewAccount(req: Request) {
  await load();
  const sig = await signalsFromRequest(req);
  const rows = g.__apAbuse ?? [];
  const hit = rows.some(
    (r) =>
      r.ipHash === sig.ipHash ||
      (sig.hasFp && r.fpHash === sig.fpHash) ||
      (sig.hasDid && r.didHash === sig.didHash),
  );
  return hit ? 0 : FREE_LISTING_QUOTA;
}

export async function recordAccountSignals(userId: string, req: Request) {
  await load();
  const sig = await signalsFromRequest(req);
  const rows = g.__apAbuse ?? [];
  if (rows.some((r) => r.userId === userId)) return;
  rows.push({ userId, ...sig, at: Date.now() });
  g.__apAbuse = rows;
  await persist();
}
