import { PrismaClient } from "@prisma/client";

// Next.js の開発モードでは HMR のたびに PrismaClient が増えないようシングルトンにする
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
