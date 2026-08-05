/**
 * One-time cleanup: delete legacy bcrypt-hashed refresh tokens.
 * Those rows false-match any JWT for the same user (bcrypt 72-byte truncation).
 *
 * Usage: npx tsx scripts/cleanup-legacy-refresh-tokens.ts
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config();

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { tokenHash: { startsWith: "$2a$" } },
        { tokenHash: { startsWith: "$2b$" } },
        { tokenHash: { startsWith: "$2y$" } },
      ],
    },
  });

  console.log(`Deleted ${result.count} legacy bcrypt RefreshToken row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
