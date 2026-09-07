import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Reuse one client per process in every environment. In dev this survives HMR;
// on serverless it lets warm invocations skip reconnecting to the database.
globalForPrisma.prisma = prisma;
