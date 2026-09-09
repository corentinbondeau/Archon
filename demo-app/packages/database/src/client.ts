import { PrismaClient } from "@prisma/client";

const globalForDemoAppDatabase = globalThis as unknown as {
  demoAppPrismaClient?: PrismaClient;
};

export const demoAppPrismaClient =
  globalForDemoAppDatabase.demoAppPrismaClient ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForDemoAppDatabase.demoAppPrismaClient = demoAppPrismaClient;
}