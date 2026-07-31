import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

type SeedListing = {
  domain: string;
  niche: string;
  da: number;
  dr: number;
  traffic: number;
  country: string;
  maxDofollow: number;
  guest: number;
  insert: number;
  tat: string;
  owner: string;
  trend: string;
};

async function main() {
  const adminHash = await bcrypt.hash("Admin123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  const superHash = await bcrypt.hash("SuperAdmin123!", 12);
  await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: {},
    create: {
      email: "superadmin@example.com",
      name: "Super Admin",
      passwordHash: superHash,
      role: Role.SUPER_ADMIN,
    },
  });

  const listingCount = await prisma.marketplaceListing.count();
  if (listingCount === 0) {
    const raw = readFileSync(join(__dirname, "data/site-listings.json"), "utf8");
    const listings = JSON.parse(raw) as SeedListing[];
    await prisma.marketplaceListing.createMany({ data: listings });
    console.log(`Seeded ${listings.length} marketplace listings`);
  } else {
    console.log(`Marketplace listings already present (${listingCount}), skipping`);
  }

  console.log("Seed completed:");
  console.log("  admin@example.com / Admin123! (ADMIN)");
  console.log("  superadmin@example.com / SuperAdmin123! (SUPER_ADMIN)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
