import "server-only";
import type { Prisma } from "@prisma/client";
import { readTeam } from "@/lib/business/shared";
import { isManagedStorageKey, isOwnBusinessImage, ownBlobHost, storageKeyFromUrl } from "@/lib/storage/media";

export const BLOB_DELETE_REASONS = ["account_delete", "listing_edit", "business_replace", "other"] as const;
export type BlobDeleteReason = (typeof BLOB_DELETE_REASONS)[number];

export const BLOB_DELETE_STATUSES = ["pending", "processing", "done", "failed_permanent"] as const;
export type BlobDeleteStatus = (typeof BLOB_DELETE_STATUSES)[number];

const OWNER_UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const LISTING_KEY = new RegExp(`^listings/(${OWNER_UUID})/[0-9a-f-]{36}\\.(jpe?g|png|webp)$`, "i");
const AVATAR_KEY = new RegExp(`^avatars/(${OWNER_UUID})/[0-9a-f-]{36}\\.webp$`, "i");
const BUSINESS_KEY = new RegExp(`^business/(${OWNER_UUID})/(logo|cover|team)-[0-9a-f-]{36}\\.webp$`, "i");

/** Interactive / extended Prisma transaction client (structural). */
export type BlobDeleteQueueTx = {
  pendingBlobDelete: {
    findUnique: (args: { where: { storageKey: string } }) => Promise<{
      id: string;
      storageKey: string;
      status: string;
      attempts: number;
    } | null>;
    create: (args: {
      data: {
        storageKey: string;
        reason: string;
        status: string;
        attempts: number;
        nextAttemptAt: Date;
      };
    }) => Promise<{ id: string; storageKey: string; status: string }>;
    update: (args: {
      where: { storageKey: string };
      data: {
        status?: string;
        reason?: string;
        attempts?: number;
        nextAttemptAt?: Date;
        lastErrorCode?: string | null;
        processedAt?: Date | null;
      };
    }) => Promise<{ id: string; storageKey: string; status: string }>;
  };
  listingImage: {
    findMany: (args: {
      where: Prisma.ListingImageWhereInput;
      select: { storageKey: true; url: true };
    }) => Promise<Array<{ storageKey: string; url: string }>>;
  };
  profile: {
    findMany: (args: {
      where: Prisma.ProfileWhereInput;
      select: { avatarUrl: true };
    }) => Promise<Array<{ avatarUrl: string | null }>>;
  };
  businessAccount: {
    findMany: (args: {
      where?: Prisma.BusinessAccountWhereInput;
      select: { logoUrl: true; coverUrl: true; team: true };
    }) => Promise<Array<{ logoUrl: string | null; coverUrl: string | null; team: unknown }>>;
  };
};

export type EnqueueBlobDeleteInput = {
  storageKey: string;
  reason: BlobDeleteReason;
  /** When set, key path must belong to this user (listings|avatars|business/{userId}/…). */
  expectedOwnerUserId?: string;
  now?: Date;
};

export type EnqueueBlobDeleteResult =
  | { ok: true; outcome: "created" | "already_pending" | "already_done" | "reopened"; id: string; storageKey: string }
  | { ok: false; error: string };

export function parseManagedBlobOwnerId(storageKey: string): string | null {
  const listing = LISTING_KEY.exec(storageKey);
  if (listing) return listing[1]!.toLowerCase();
  const avatar = AVATAR_KEY.exec(storageKey);
  if (avatar) return avatar[1]!.toLowerCase();
  const business = BUSINESS_KEY.exec(storageKey);
  if (business) return business[1]!.toLowerCase();
  return null;
}

/**
 * Central gate for queueable Blob keys: managed prefix, no traversal, upload-shaped path,
 * and optional owner match. Rejects remote/ and any non-platform layout.
 */
export function assertQueueableBlobKey(
  storageKey: string,
  expectedOwnerUserId?: string,
): { ok: true; ownerUserId: string } | { ok: false; error: string } {
  const key = storageKey.trim();
  if (!key || key.length > 512) return { ok: false, error: "blob_queue.err.key" };
  if (key.startsWith("remote/")) return { ok: false, error: "blob_queue.err.remote" };
  if (!isManagedStorageKey(key)) return { ok: false, error: "blob_queue.err.unmanaged" };
  if (key.includes("..") || key.includes("\\") || key.includes("\0")) {
    return { ok: false, error: "blob_queue.err.traversal" };
  }
  const ownerUserId = parseManagedBlobOwnerId(key);
  if (!ownerUserId) return { ok: false, error: "blob_queue.err.shape" };
  if (expectedOwnerUserId) {
    if (!/^[0-9a-f-]{36}$/i.test(expectedOwnerUserId)) {
      return { ok: false, error: "blob_queue.err.owner" };
    }
    if (ownerUserId !== expectedOwnerUserId.toLowerCase()) {
      return { ok: false, error: "blob_queue.err.owner" };
    }
  }
  return { ok: true, ownerUserId };
}

/** Reject external / foreign-host URLs before deriving a key for enqueue. */
export function assertOwnBlobUrlOrMediaPath(url: string): { ok: true; storageKey: string } | { ok: false; error: string } {
  const raw = url.trim();
  if (!raw) return { ok: false, error: "blob_queue.err.url" };
  if (raw.startsWith("/api/media/")) {
    const key = storageKeyFromUrl(raw);
    const gate = assertQueueableBlobKey(key);
    if (!gate.ok) return gate;
    return { ok: true, storageKey: key };
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "blob_queue.err.url" };
  }
  if (parsed.protocol !== "https:") return { ok: false, error: "blob_queue.err.url" };
  const host = ownBlobHost();
  if (!host || parsed.hostname.toLowerCase() !== host) {
    return { ok: false, error: "blob_queue.err.foreign_host" };
  }
  const key = storageKeyFromUrl(raw);
  const gate = assertQueueableBlobKey(key);
  if (!gate.ok) return gate;
  if (key !== decodeURIComponent(parsed.pathname.replace(/^\//, ""))) {
    return { ok: false, error: "blob_queue.err.url" };
  }
  return { ok: true, storageKey: key };
}

export function assertOwnBusinessBlobUrl(
  userId: string,
  url: string,
  kinds: ReadonlyArray<"logo" | "cover" | "team"> = ["logo", "cover", "team"],
): { ok: true; storageKey: string } | { ok: false; error: string } {
  if (!isOwnBusinessImage(userId, url, kinds)) return { ok: false, error: "blob_queue.err.owner" };
  return assertOwnBlobUrlOrMediaPath(url);
}

/**
 * Active DB references that must block physical delete (future worker).
 * Listing rows, profile avatars, and business logo/cover/team photo URLs.
 */
export async function countActiveBlobReferences(tx: BlobDeleteQueueTx, storageKey: string): Promise<number> {
  const gate = assertQueueableBlobKey(storageKey);
  if (!gate.ok) return Number.POSITIVE_INFINITY;

  const mediaPath = `/api/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
  // Platform uploads always persist `storage_key`; also match local media paths and own-host HTTPS URLs.
  const listingRows = await tx.listingImage.findMany({
    where: {
      OR: [{ storageKey }, { url: storageKey }, { url: mediaPath }, { url: { contains: storageKey } }],
    },
    select: { storageKey: true, url: true },
  });
  const listingRefs = listingRows.filter(
    (row) => row.storageKey === storageKey || row.url === storageKey || row.url === mediaPath || storageKeyFromUrl(row.url) === storageKey,
  ).length;

  const avatarRows = await tx.profile.findMany({
    where: {
      OR: [{ avatarUrl: storageKey }, { avatarUrl: mediaPath }, { avatarUrl: { contains: storageKey } }],
    },
    select: { avatarUrl: true },
  });
  const avatarRefs = avatarRows.filter((row) => {
    const url = row.avatarUrl;
    if (!url) return false;
    return url === storageKey || url === mediaPath || storageKeyFromUrl(url) === storageKey;
  }).length;

  // Business URLs are free-form strings; scan logo/cover and team JSON photos.
  const businesses = await tx.businessAccount.findMany({
    select: { logoUrl: true, coverUrl: true, team: true },
  });
  let businessRefs = 0;
  for (const row of businesses) {
    for (const url of [row.logoUrl, row.coverUrl]) {
      if (!url) continue;
      if (url === storageKey || url === mediaPath || storageKeyFromUrl(url) === storageKey) businessRefs++;
    }
    const team = Array.isArray(row.team) ? row.team : [];
    for (const member of team) {
      const photo =
        member && typeof member === "object" && "photo" in member
          ? String((member as { photo?: unknown }).photo ?? "")
          : "";
      if (!photo) continue;
      if (photo === storageKey || photo === mediaPath || storageKeyFromUrl(photo) === storageKey) {
        businessRefs++;
      }
    }
  }

  return listingRefs + avatarRefs + businessRefs;
}

/**
 * Insert or reconcile a queue row inside an interactive transaction.
 * Does not call Blob delete. Does not store URL / email / IP / token.
 */
export async function enqueuePendingBlobDelete(
  tx: BlobDeleteQueueTx,
  input: EnqueueBlobDeleteInput,
): Promise<EnqueueBlobDeleteResult> {
  if (!BLOB_DELETE_REASONS.includes(input.reason)) {
    return { ok: false, error: "blob_queue.err.reason" };
  }
  const gate = assertQueueableBlobKey(input.storageKey, input.expectedOwnerUserId);
  if (!gate.ok) return gate;

  const now = input.now ?? new Date();
  const storageKey = input.storageKey.trim();
  const row = await tx.pendingBlobDelete.findUnique({ where: { storageKey } });
  if (!row) {
    const created = await tx.pendingBlobDelete.create({
      data: {
        storageKey,
        reason: input.reason,
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
      },
    });
    return { ok: true, outcome: "created", id: created.id, storageKey };
  }

  if (row.status === "pending" || row.status === "processing") {
    return { ok: true, outcome: "already_pending", id: row.id, storageKey: row.storageKey };
  }
  if (row.status === "done") {
    // Physical delete already recorded; do not reopen (idempotent). Key reuse is UUID-rare.
    return { ok: true, outcome: "already_done", id: row.id, storageKey: row.storageKey };
  }
  if (row.status === "failed_permanent") {
    const updated = await tx.pendingBlobDelete.update({
      where: { storageKey },
      data: {
        status: "pending",
        reason: input.reason,
        attempts: 0,
        nextAttemptAt: now,
        lastErrorCode: null,
        processedAt: null,
      },
    });
    return { ok: true, outcome: "reopened", id: updated.id, storageKey: updated.storageKey };
  }

  return { ok: false, error: "blob_queue.err.status" };
}

export type AccountBlobDeleteTarget = {
  storageKey: string;
  url?: string;
};

/**
 * Collect platform-managed Blob keys owned by this user for account deletion.
 * External / foreign-host URLs and non-managed keys are omitted (not queued, not deleted).
 * Managed keys with wrong owner path are still included so enqueue can fail closed.
 */
export function collectAccountBlobDeleteTargets(input: {
  userId: string;
  listingImages: Array<{ storageKey: string; url: string }>;
  avatarUrl?: string | null;
  business?: { logoUrl: string | null; coverUrl: string | null; team: unknown } | null;
}): AccountBlobDeleteTarget[] {
  const out: AccountBlobDeleteTarget[] = [];
  const seen = new Set<string>();

  const addIfManaged = (storageKey: string, url?: string) => {
    const key = storageKey.trim();
    if (!key || !isManagedStorageKey(key)) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ storageKey: key, ...(url ? { url } : {}) });
  };

  for (const img of input.listingImages) {
    addIfManaged(img.storageKey, img.url);
  }

  if (input.avatarUrl) {
    const key = storageKeyFromUrl(input.avatarUrl);
    addIfManaged(key, input.avatarUrl);
  }

  const biz = input.business;
  if (biz) {
    for (const url of [biz.logoUrl, biz.coverUrl]) {
      if (!url || !isOwnBusinessImage(input.userId, url)) continue;
      addIfManaged(storageKeyFromUrl(url), url);
    }
    for (const { photo } of readTeam(biz.team)) {
      if (!photo || !isOwnBusinessImage(input.userId, photo, ["team"])) continue;
      addIfManaged(storageKeyFromUrl(photo), photo);
    }
  }

  return out;
}

/**
 * Enqueue every managed target inside the interactive transaction.
 * Any managed key that cannot be queued throws — caller must not commit anonymization.
 */
export async function enqueueAccountBlobDeletes(
  tx: BlobDeleteQueueTx,
  userId: string,
  targets: AccountBlobDeleteTarget[],
): Promise<{ enqueued: number }> {
  let enqueued = 0;
  for (const t of targets) {
    if (!isManagedStorageKey(t.storageKey)) continue;
    const result = await enqueuePendingBlobDelete(tx, {
      storageKey: t.storageKey,
      reason: "account_delete",
      expectedOwnerUserId: userId,
    });
    if (!result.ok) {
      throw new Error(`blob_queue.enqueue_failed:${result.error}`);
    }
    enqueued += 1;
  }
  return { enqueued };
}

export type ListingEditBlobDeleteTarget = {
  storageKey: string;
  url?: string;
};

/**
 * Managed listing keys dropped from an edit payload. Keeps URLs still present in `keepUrls`.
 * External / unmanaged / foreign-owner keys are omitted (never queued, never deleted).
 */
export function collectListingEditBlobDeleteTargets(input: {
  sellerId: string;
  existingImages: Array<{ storageKey: string; url: string }>;
  keepUrls: ReadonlyArray<string>;
}): ListingEditBlobDeleteTarget[] {
  const keep = new Set(input.keepUrls);
  const out: ListingEditBlobDeleteTarget[] = [];
  const seen = new Set<string>();

  for (const img of input.existingImages) {
    if (keep.has(img.url)) continue;
    const key = (img.storageKey?.trim() || storageKeyFromUrl(img.url)).trim();
    if (!key || !isManagedStorageKey(key)) continue;
    const gate = assertQueueableBlobKey(key, input.sellerId);
    if (!gate.ok) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ storageKey: key, ...(img.url ? { url: img.url } : {}) });
  }
  return out;
}

/**
 * Enqueue removed listing photos inside the interactive listing-update transaction.
 * Any managed own key that cannot be queued throws — caller must not commit the image rewrite.
 */
export async function enqueueListingEditBlobDeletes(
  tx: BlobDeleteQueueTx,
  sellerId: string,
  targets: ListingEditBlobDeleteTarget[],
): Promise<{ enqueued: number }> {
  let enqueued = 0;
  for (const t of targets) {
    if (!isManagedStorageKey(t.storageKey)) continue;
    const result = await enqueuePendingBlobDelete(tx, {
      storageKey: t.storageKey,
      reason: "listing_edit",
      expectedOwnerUserId: sellerId,
    });
    if (!result.ok) {
      throw new Error(`blob_queue.enqueue_failed:${result.error}`);
    }
    enqueued += 1;
  }
  return { enqueued };
}

/**
 * Mark a queue row done only after a confirmed physical delete.
 * No-op when the row is missing. Does not create rows.
 */
export async function markPendingBlobDeleteDone(
  tx: BlobDeleteQueueTx,
  storageKey: string,
  now: Date = new Date(),
): Promise<{ ok: true; updated: boolean } | { ok: false; error: string }> {
  const gate = assertQueueableBlobKey(storageKey);
  if (!gate.ok) return gate;
  const row = await tx.pendingBlobDelete.findUnique({ where: { storageKey: storageKey.trim() } });
  if (!row) return { ok: true, updated: false };
  if (row.status === "done") return { ok: true, updated: false };
  await tx.pendingBlobDelete.update({
    where: { storageKey: storageKey.trim() },
    data: {
      status: "done",
      processedAt: now,
      lastErrorCode: null,
    },
  });
  return { ok: true, updated: true };
}
