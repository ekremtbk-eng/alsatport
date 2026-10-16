import { Prisma, PrismaClient } from "@prisma/client";
import { PRISMA_WRITE_OPERATIONS, assertPreviewWritesAllowed, isPreviewWriteLockActive } from "@/lib/security/previewLock";

/**
 * All database access goes through Prisma's parameterized query engine.
 * Do not add $queryRawUnsafe / string-concatenated SQL.
 *
 * On Vercel Preview, mutating Prisma operations throw PreviewWriteBlockedError
 * so shared Production data cannot be changed through preview deployments.
 *
 * Interactive $transaction clients in Prisma 6 do not reliably inherit query
 * extensions, so $transaction itself is gated when the Preview lock is active.
 */
const previewWriteLockExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: "previewWriteLock",
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          if (isPreviewWriteLockActive() && PRISMA_WRITE_OPERATIONS.has(operation)) {
            assertPreviewWritesAllowed(operation);
          }
          return query(args);
        },
      },
      // Raw SQL can mutate (incl. INSERT…RETURNING via $queryRaw used by throttle).
      async $executeRaw({ args, query }) {
        assertPreviewWritesAllowed("$executeRaw");
        return query(args);
      },
      async $executeRawUnsafe({ args, query }) {
        assertPreviewWritesAllowed("$executeRawUnsafe");
        return query(args);
      },
      async $queryRaw({ args, query }) {
        assertPreviewWritesAllowed("$queryRaw");
        return query(args);
      },
      async $queryRawUnsafe({ args, query }) {
        assertPreviewWritesAllowed("$queryRawUnsafe");
        return query(args);
      },
    },
    client: {
      // Interactive tx clients may skip query extensions; gate the entrypoint.
      // Cast keeps Prisma's interactive + batch overloads intact for callers.
      $transaction: ((...args: unknown[]) => {
        assertPreviewWritesAllowed("$transaction");
        return (client as { $transaction: (...a: unknown[]) => unknown }).$transaction(...args);
      }) as typeof client.$transaction,
    },
  }),
);

function createPrisma() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return base.$extends(previewWriteLockExtension);
}

type AppPrisma = ReturnType<typeof createPrisma>;

const g = globalThis as unknown as { __apPrisma?: AppPrisma };

export const prisma = g.__apPrisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") g.__apPrisma = prisma;
