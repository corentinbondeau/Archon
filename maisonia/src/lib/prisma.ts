import { PrismaClient } from "@prisma/client";

const prismeGlobal = globalThis as typeof globalThis & {
  prismaClient: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  prismeGlobal.prismaClient ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  prismeGlobal.prismaClient = prisma;
}
