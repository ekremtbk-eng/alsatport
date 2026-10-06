import { PrismaClient } from "@prisma/client";

/**
 * All database access goes through Prisma's parameterized query engine.
 * Do not add $queryRawUnsafe / string-concatenated SQL.
 */
const g = globalThis as unknown as { __apPrisma?: PrismaClient };

export const prisma =
  g.__apPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") g.__apPrisma = prisma;
