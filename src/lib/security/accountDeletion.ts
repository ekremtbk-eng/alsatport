import type { AuthProvider } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";
import { createAccountTombstone, emailEmbedsUuid } from "@/lib/security/accountTombstone";

export const DELETED_MESSAGE_BODY = "Bu mesaj, hesabını silen bir kullanıcıya aitti.";

const TOMBSTONE_ATTEMPTS = 6;

/** Interactive tx — `any` delegates keep Prisma Exact<> / $extends clients assignable. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxDelegate = { updateMany: (...args: any[]) => Promise<{ count: number }>; deleteMany: (...args: any[]) => Promise<{ count: number }>; update: (...args: any[]) => Promise<unknown> };

export type AccountDeletionTx = {
  listing: Pick<TxDelegate, "updateMany">;
  listingImage: Pick<TxDelegate, "deleteMany">;
  message: Pick<TxDelegate, "updateMany">;
  conversation: Pick<TxDelegate, "updateMany">;
  favorite: Pick<TxDelegate, "deleteMany">;
  savedSearch: Pick<TxDelegate, "deleteMany">;
  userBlock: Pick<TxDelegate, "deleteMany">;
  qrToken: Pick<TxDelegate, "deleteMany">;
  verificationOtp: Pick<TxDelegate, "deleteMany">;
  conversationRead: Pick<TxDelegate, "deleteMany">;
  sellerReview: Pick<TxDelegate, "deleteMany">;
  businessAccount: Pick<TxDelegate, "deleteMany">;
  notification: Pick<TxDelegate, "deleteMany">;
  profile: Pick<TxDelegate, "update">;
  user: Pick<TxDelegate, "update">;
};

function isUniqueViolation(err: unknown): boolean {
  return err instanceof PrismaNS.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * In-transaction anonymization for account deletion.
 * Does not touch payments, reports, soft-deleted listing rows, or audit logs.
 * Clears inbox notifications and personal preference fields (no legal-retention basis).
 */
export async function anonymizeAccountInTransaction(
  tx: AccountDeletionTx,
  input: {
    userId: string;
    provider: AuthProvider;
    unusablePasswordHash: string | null;
    now?: Date;
    /** Test/injection hook — defaults to cryptographic `createAccountTombstone`. */
    createTombstone?: typeof createAccountTombstone;
  },
): Promise<{ removedListings: number; email: string; username: string }> {
  const now = input.now ?? new Date();
  const userId = input.userId;
  const makeTombstone = input.createTombstone ?? createAccountTombstone;

  const listings = await tx.listing.updateMany({
    where: { sellerId: userId, deletedAt: null },
    data: { status: "removed", deletedAt: now },
  });
  await tx.listingImage.deleteMany({ where: { listing: { sellerId: userId } } });
  await tx.message.updateMany({
    where: { senderId: userId },
    data: { body: DELETED_MESSAGE_BODY, deletedAt: now },
  });
  await tx.conversation.updateMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    data: { lastMessage: null },
  });
  await tx.favorite.deleteMany({ where: { userId } });
  await tx.savedSearch.deleteMany({ where: { userId } });
  await tx.userBlock.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
  await tx.qrToken.deleteMany({ where: { userId } });
  await tx.verificationOtp.deleteMany({ where: { userId } });
  await tx.conversationRead.deleteMany({ where: { userId } });
  await tx.sellerReview.deleteMany({ where: { OR: [{ authorId: userId }, { sellerId: userId }] } });
  await tx.businessAccount.deleteMany({ where: { userId } });
  // Inbox rows are UX-only; no statutory retention identified — delete with the account.
  await tx.notification.deleteMany({ where: { userId } });

  await tx.profile.update({
    where: { userId },
    data: {
      displayName: "Silinmiş kullanıcı",
      fullName: null,
      avatarUrl: null,
      phone: null,
      phoneVerifiedAt: null,
      birthDate: null,
      nationalId: null,
      address: null,
      city: null,
      verified: false,
      businessName: null,
      businessVerifiedAt: null,
      profileComplete: false,
      notifPriceDrop: false,
      notifSavedSearch: false,
      notifNearby: false,
      twoFactorEnabled: false,
      twoFactorMethod: "email",
      recoveryEmail: null,
      recoveryEmailVerifiedAt: null,
      readReceipts: false,
      marketingEmail: false,
      marketingSms: false,
      marketingPush: false,
      marketingUpdatedAt: now,
      notificationPrefs: {},
    },
  });

  // PostgreSQL aborts the whole txn on unique violations unless a SAVEPOINT isolates the failed statement.
  const txRaw = tx as AccountDeletionTx & {
    $executeRawUnsafe?: (sql: string) => Promise<unknown>;
  };
  if (typeof txRaw.$executeRawUnsafe !== "function") {
    throw new Error("account deletion requires a Prisma interactive transaction client");
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < TOMBSTONE_ATTEMPTS; attempt++) {
    const tomb = makeTombstone();
    if (emailEmbedsUuid(tomb.email)) {
      throw new Error("tombstone email must not embed a UUID");
    }
    const sp = `tombstone_alloc_${attempt}`;
    await txRaw.$executeRawUnsafe(`SAVEPOINT ${sp}`);
    try {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: tomb.email,
          username: tomb.username,
          passwordHash: input.provider === "email" ? input.unusablePasswordHash : null,
          providerSub: null,
          emailVerifiedAt: null,
          bannedAt: now,
          bannedReason: "account_deleted",
        },
      });
      await txRaw.$executeRawUnsafe(`RELEASE SAVEPOINT ${sp}`);
      return { removedListings: listings.count, email: tomb.email, username: tomb.username };
    } catch (err) {
      lastErr = err;
      await txRaw.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${sp}`).catch(() => undefined);
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("tombstone unique allocation failed");
}
