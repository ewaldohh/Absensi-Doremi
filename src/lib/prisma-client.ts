import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

export function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3(
    {
      url: process.env.DATABASE_URL ?? "file:./dev.db"
    },
    {
      timestampFormat: "iso8601"
    }
  );

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}
