-- Remap ServiceType enum and listing price columns before prisma db push.
-- Safe to re-run: skips enum rewrite once GUEST/INSERT are gone.

DO $$ BEGIN
  CREATE TYPE "NicheType" AS ENUM ('REGULAR', 'GRAY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "nicheType" "NicheType" NOT NULL DEFAULT 'REGULAR';

ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "guestPostRegular" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "guestPostGray" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "linkInsertRegular" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "linkInsertGray" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "brandPromotionRegular" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "brandPromotionGray" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "pressNewsRegular" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "pressNewsGray" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "sidebarLinkRegular" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "sidebarLinkGray" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "bannerAdsRegular" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "bannerAdsGray" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'MarketplaceListing' AND column_name = 'guest'
  ) THEN
    UPDATE "MarketplaceListing"
    SET
      "guestPostRegular" = "guest",
      "linkInsertRegular" = "insert"
    WHERE "guestPostRegular" = 0 AND "linkInsertRegular" = 0;
    ALTER TABLE "MarketplaceListing" DROP COLUMN "guest";
    ALTER TABLE "MarketplaceListing" DROP COLUMN "insert";
  END IF;
END $$;

DROP INDEX IF EXISTS "MarketplaceListing_guest_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ServiceType' AND e.enumlabel IN ('GUEST', 'INSERT')
  ) THEN
    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "serviceTypeNew" TEXT;
    UPDATE "OrderItem" SET "serviceTypeNew" = CASE
      WHEN "serviceType"::text IN ('GUEST', 'GUEST_POST') THEN 'GUEST_POST'
      WHEN "serviceType"::text IN ('INSERT', 'LINK_INSERT') THEN 'LINK_INSERT'
      WHEN "serviceType"::text IN ('BRAND_PROMOTION', 'PRESS_NEWS', 'SIDEBAR_LINK', 'BANNER_ADS')
        THEN "serviceType"::text
      ELSE 'GUEST_POST'
    END;
    ALTER TABLE "OrderItem" DROP COLUMN "serviceType";
    DROP TYPE IF EXISTS "ServiceType";
    CREATE TYPE "ServiceType" AS ENUM (
      'GUEST_POST',
      'LINK_INSERT',
      'BRAND_PROMOTION',
      'PRESS_NEWS',
      'SIDEBAR_LINK',
      'BANNER_ADS'
    );
    ALTER TABLE "OrderItem" ADD COLUMN "serviceType" "ServiceType" NOT NULL DEFAULT 'GUEST_POST';
    UPDATE "OrderItem" SET "serviceType" = "serviceTypeNew"::"ServiceType";
    ALTER TABLE "OrderItem" DROP COLUMN "serviceTypeNew";
  END IF;
END $$;
