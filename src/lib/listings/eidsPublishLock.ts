import { lookupCategory } from "@/data/categories";

/**
 * Temporary publish gate for emlak / vasıta trees until an approved EİDS (or
 * substitute) flow exists. This module does NOT implement EİDS itself — it only
 * blocks unauthorized publish while legal scope is resolved.
 *
 * Default: ON in every environment. A lone `EIDS_PUBLISH_LOCK=0` (or any other
 * flag) cannot disable it. Unlock requires an explicit confirmation string
 * (ops runbook / open approval only):
 *
 *   EIDS_PUBLISH_UNLOCK=I_CONFIRM_EIDS_GATE_OFF
 *
 * Optional narrowing via `EIDS_GATE_CATEGORY_PREFIXES` (comma-separated). Each
 * entry must be `emlak` / `vasita` or a descendant prefix (`emlak-…`, `vasita-…`).
 * Unknown / out-of-tree tokens are ignored; if nothing valid remains, defaults
 * are used so a typo cannot silently open the trees.
 */

export const EIDS_REQUIRED_ERROR = "listing.err.eidsRequired" as const;

/** Exact unlock token — anything else keeps the gate closed. */
export const EIDS_PUBLISH_UNLOCK_TOKEN = "I_CONFIRM_EIDS_GATE_OFF";

const DEFAULT_PREFIXES = ["emlak", "vasita"] as const;

function isAllowedGatePrefix(prefix: string): boolean {
  for (const root of DEFAULT_PREFIXES) {
    if (prefix === root || prefix.startsWith(`${root}-`)) return true;
  }
  return false;
}

/** Exported for tests — resolves effective prefixes after sanitizing env. */
export function eidsGatePrefixes(): string[] {
  const raw = (process.env.EIDS_GATE_CATEGORY_PREFIXES ?? "").trim();
  if (!raw) return [...DEFAULT_PREFIXES];
  const valid = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .filter(isAllowedGatePrefix);
  if (!valid.length) {
    console.error(
      "[eidsPublishLock] EIDS_GATE_CATEGORY_PREFIXES had no valid emlak/vasita prefixes; using defaults",
    );
    return [...DEFAULT_PREFIXES];
  }
  return valid;
}

/** Gate is active unless unlock token is set exactly. */
export function isEidsPublishLockActive(): boolean {
  return (process.env.EIDS_PUBLISH_UNLOCK ?? "").trim() !== EIDS_PUBLISH_UNLOCK_TOKEN;
}

/**
 * True when the category falls under the active gate prefixes
 * (after alias resolution). Unrelated trees (e.g. `parts-*`) are out.
 */
export function isEidsGateCategory(categoryId: string): boolean {
  const resolved = lookupCategory(categoryId)?.id ?? categoryId.trim();
  if (!resolved || resolved.includes("..")) return false;
  const id = resolved.toLowerCase();
  for (const prefix of eidsGatePrefixes()) {
    if (id === prefix || id.startsWith(`${prefix}-`)) return true;
  }
  return false;
}

/**
 * Blocks transitions that would put a gated-category listing into `active`.
 * Content edits on an already-active gated listing are allowed.
 */
export function eidsBlocksActivePublish(
  categoryId: string,
  existing?: { status: string; categoryId: string } | null,
): boolean {
  if (!isEidsPublishLockActive()) return false;
  if (!isEidsGateCategory(categoryId)) return false;
  if (existing?.status === "active" && isEidsGateCategory(existing.categoryId)) return false;
  return true;
}

/**
 * A1: while the publish lock is on, gated categories may be saved as `draft`
 * (owner-only) but must not become publicly `active` without a later EİDS path.
 */
export function eidsRequiresDraftSave(categoryId: string): boolean {
  return isEidsPublishLockActive() && isEidsGateCategory(categoryId);
}

export function eidsPublishBlockedResponse(): { error: typeof EIDS_REQUIRED_ERROR; status: 403 } {
  return { error: EIDS_REQUIRED_ERROR, status: 403 };
}
