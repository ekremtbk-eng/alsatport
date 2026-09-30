import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __apPrisma?: PrismaClient };

export const prisma =
  g.__apPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") g.__apPrisma = prisma;
