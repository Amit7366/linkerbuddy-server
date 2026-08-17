import { PrismaClient, Role, ServiceType } from "@prisma/client";
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

const SEED_REVIEWERS = [
  { email: "ava.chen@example.com", name: "Ava Chen" },
  { email: "marcus.reed@example.com", name: "Marcus Reed" },
  { email: "sofia.nair@example.com", name: "Sofia Nair" },
  { email: "liam.brooks@example.com", name: "Liam Brooks" },
  { email: "hana.okada@example.com", name: "Hana Okada" },
  { email: "diego.ramos@example.com", name: "Diego Ramos" },
] as const;

const SEED_REVIEWS: Array<{ rating: number; description: string }> = [
  {
    rating: 5,
    description:
      "Placement went live on schedule and the live URL matched the brief. Clear reporting and easy follow-up.",
  },
  {
    rating: 4,
    description:
      "Solid inventory quality and transparent pricing. Turnaround was a day slower than promised but still good.",
  },
  {
    rating: 5,
    description:
      "Great niche fit for our SaaS campaign. The editorial notes helped us ship content without revisions.",
  },
  {
    rating: 3,
    description:
      "Delivery completed successfully. Communication could be a bit faster during the publishing window.",
  },
  {
    rating: 5,
    description:
      "Used Linkerbuddy for a multi-site push. Metrics looked accurate and checkout was straightforward.",
  },
  {
    rating: 4,
    description:
      "Happy with the guest post quality. Domain authority matched the listing and links were dofollow.",
  },
  {
    rating: 5,
    description:
      "Excellent experience from shortlist to live report. Will use again for the next agency campaign.",
  },
  {
    rating: 2,
    description:
      "Order eventually completed, but we needed extra clarification on content guidelines mid-process.",
  },
  {
    rating: 4,
    description:
      "India marketplace picks were strong. Pricing felt fair and the report was client-ready.",
  },
  {
    rating: 5,
    description:
      "Fast acceptance and smooth publishing. The team handled niche edits without friction.",
  },
  {
    rating: 4,
    description:
      "Reliable fulfillment for our reseller clients. Status updates in the account area were useful.",
  },
  {
    rating: 3,
    description:
      "Average experience overall. Site was fine, though traffic estimates felt a touch optimistic.",
  },
  {
    rating: 5,
    description:
      "Best placement vendor we tried this quarter. Inventory filters saved hours of manual research.",
  },
  {
    rating: 4,
    description:
      "Clean process and honest TAT. Would like more bulk discount options for larger campaigns.",
  },
  {
    rating: 5,
    description:
      "Live URL arrived promptly with everything documented. Exactly what our SEO team needed.",
  },
];

/** First 4 reviews are hidden from the home page */
const OFF_HOME_COUNT = 4;

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

  const availabilityCount = await prisma.availabilityRule.count();
  if (availabilityCount === 0) {
    await prisma.availabilityRule.createMany({
      data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: "10:00",
        endTime: "18:00",
        timezone: "Asia/Dhaka",
      })),
    });
    console.log("Seeded Mon–Fri 10:00–18:00 Asia/Dhaka availability");
  }

  const customerHash = await bcrypt.hash("Customer123!", 12);
  const reviewers = [];
  for (const reviewer of SEED_REVIEWERS) {
    const user = await prisma.user.upsert({
      where: { email: reviewer.email },
      update: { name: reviewer.name },
      create: {
        email: reviewer.email,
        name: reviewer.name,
        passwordHash: customerHash,
        role: Role.CUSTOMER,
      },
    });
    reviewers.push(user);
  }

  const existingSeedOrders = await prisma.order.count({
    where: { orderNumber: { startsWith: "LB-SEED-REV-" } },
  });

  if (existingSeedOrders >= 15) {
    console.log(
      `Seed reviews already present (${existingSeedOrders} seed orders), skipping review seed`,
    );
  } else {
    // Remove partial seed runs so we can recreate cleanly
    const stale = await prisma.order.findMany({
      where: { orderNumber: { startsWith: "LB-SEED-REV-" } },
      select: { id: true },
    });
    if (stale.length > 0) {
      await prisma.order.deleteMany({
        where: { id: { in: stale.map((o) => o.id) } },
      });
    }

    const listing = await prisma.marketplaceListing.findFirst({
      orderBy: { id: "asc" },
    });
    if (!listing) {
      throw new Error("No marketplace listing available to seed review orders");
    }

    const unitPriceCents = Math.round(listing.guest * 100);

    for (let i = 0; i < SEED_REVIEWS.length; i++) {
      const reviewer = reviewers[i % reviewers.length]!;
      const reviewData = SEED_REVIEWS[i]!;
      const orderNumber = `LB-SEED-REV-${String(i + 1).padStart(2, "0")}`;
      const createdAt = new Date(Date.now() - (SEED_REVIEWS.length - i) * 86_400_000);

      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId: reviewer.id,
          status: "COMPLETE",
          paymentStatus: "PAID",
          currency: "usd",
          subtotalCents: unitPriceCents,
          totalCents: unitPriceCents,
          billingName: reviewer.name ?? "Customer",
          billingEmail: reviewer.email,
          billingPhone: "+10000000000",
          addressLine1: "100 Market Street",
          city: "San Francisco",
          state: "CA",
          postalCode: "94105",
          country: "US",
          createdAt,
          updatedAt: createdAt,
          items: {
            create: {
              listingId: listing.id,
              domain: listing.domain,
              niche: listing.niche,
              serviceType: ServiceType.GUEST,
              unitPriceCents,
              quantity: 1,
              lineTotalCents: unitPriceCents,
            },
          },
          statusEvents: {
            create: {
              fromStatus: "DELIVERING",
              toStatus: "COMPLETE",
              note: "Seeded complete order for review demos",
            },
          },
          review: {
            create: {
              userId: reviewer.id,
              rating: reviewData.rating,
              description: reviewData.description,
              showOnHome: i >= OFF_HOME_COUNT,
              createdAt,
              updatedAt: createdAt,
            },
          },
        },
      });

      void order;
    }

    console.log(
      `Seeded ${SEED_REVIEWS.length} reviews (${OFF_HOME_COUNT} hidden from home)`,
    );
  }

  const promoSeeds = [
    {
      code: "WELCOME10",
      description: "10% off any first campaign",
      type: "PERCENT" as const,
      value: 10,
      minOrderCents: 0,
      maxDiscountCents: null,
      maxUses: null,
      active: true,
      endsAt: null,
    },
    {
      code: "SAVE25",
      description: "$25 off orders of $100+",
      type: "FIXED" as const,
      value: 2500,
      minOrderCents: 10000,
      maxDiscountCents: null,
      maxUses: null,
      active: true,
      endsAt: null,
    },
    {
      code: "AGENCY15",
      description: "15% agency discount, capped at $200",
      type: "PERCENT" as const,
      value: 15,
      minOrderCents: 20000,
      maxDiscountCents: 20000,
      maxUses: null,
      active: true,
      endsAt: null,
    },
    {
      code: "FLASH50",
      description: "50% flash sale — limited uses",
      type: "PERCENT" as const,
      value: 50,
      minOrderCents: 0,
      maxDiscountCents: 15000,
      maxUses: 25,
      active: true,
      endsAt: new Date(Date.now() + 60 * 86_400_000),
    },
    {
      code: "RETENTION20",
      description: "$20 loyalty credit",
      type: "FIXED" as const,
      value: 2000,
      minOrderCents: 5000,
      maxDiscountCents: null,
      maxUses: 100,
      active: true,
      endsAt: null,
    },
  ];

  for (const promo of promoSeeds) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: {
        description: promo.description,
        type: promo.type,
        value: promo.value,
        minOrderCents: promo.minOrderCents,
        maxDiscountCents: promo.maxDiscountCents,
        maxUses: promo.maxUses,
        active: promo.active,
        endsAt: promo.endsAt,
      },
      create: promo,
    });
  }
  console.log(`Seeded ${promoSeeds.length} promo codes`);

  console.log("Seed completed:");
  console.log("  admin@example.com / Admin123! (ADMIN)");
  console.log("  superadmin@example.com / SuperAdmin123! (SUPER_ADMIN)");
  console.log("  ava.chen@example.com / Customer123! (CUSTOMER + seed reviews)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
