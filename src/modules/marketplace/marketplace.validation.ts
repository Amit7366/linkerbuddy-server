import { z } from "zod";
import { hasAnyPrice } from "./listing-prices.js";

const ownerEnum = z.enum(["Admin", "Partner"]);
const trendEnum = z.enum(["Rising", "Stable"]);

const httpUrl = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return Boolean(url.hostname.includes("."));
    } catch {
      return false;
    }
  }, "Enter a valid sample post URL");

const nichePricesSchema = z.object({
  guestPost: z.number().int().min(0),
  linkInsert: z.number().int().min(0),
  brandPromotion: z.number().int().min(0),
  pressNews: z.number().int().min(0),
  sidebarLink: z.number().int().min(0),
  bannerAds: z.number().int().min(0),
});

export const listingPricesSchema = z
  .object({
    regular: nichePricesSchema,
    gray: nichePricesSchema,
  })
  .refine(hasAnyPrice, {
    message: "At least one price must be greater than 0",
  });

export const createListingSchema = z
  .object({
    domain: z
      .string()
      .min(1, "Domain is required")
      .max(255)
      .regex(
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
        "Enter a valid domain",
      ),
    niche: z.string().min(1).max(120),
    da: z.number().int().min(0).max(100),
    dr: z.number().int().min(0).max(100),
    traffic: z.number().int().min(0),
    trafficSources: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
    country: z.string().min(1).max(120),
    dofollow: z.boolean().default(true),
    maxDofollow: z.number().int().min(0).max(100),
    prices: listingPricesSchema,
    tat: z.string().min(1).max(120),
    samplePostUrls: z.array(httpUrl).max(10).default([]),
    note: z.string().max(4000).default(""),
    owner: ownerEnum,
    trend: trendEnum,
  })
  .strict();

export const updateListingSchema = createListingSchema.partial().strict();

const filterKeyEnum = z.enum([
  "all",
  "budget",
  "authority",
  "traffic",
  "India",
  "General",
  "highDa",
]);

export const listListingsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  /** @deprecated Prefer composable params / `filters` — kept for backward compatibility */
  filter: filterKeyEnum.optional(),
  /** Comma-separated filter keys applied with AND logic */
  filters: z.string().max(200).optional(),
  country: z.string().max(120).optional(),
  niche: z.string().max(120).optional(),
  dr: z.string().max(20).optional(),
  priceMax: z.coerce.number().int().nonnegative().optional(),
  trafficMin: z.coerce.number().int().nonnegative().optional(),
  daMin: z.coerce.number().int().min(0).max(100).optional(),
  daMax: z.coerce.number().int().min(0).max(100).optional(),
  trafficMax: z.coerce.number().int().nonnegative().optional(),
  priceMin: z.coerce.number().int().nonnegative().optional(),
  sort: z
    .enum(["recommended", "price", "traffic", "dr", "da", "newest"])
    .default("recommended"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  ids: z.string().optional(),
});

export const listingIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;
export type MarketplaceFilterKey = z.infer<typeof filterKeyEnum>;
