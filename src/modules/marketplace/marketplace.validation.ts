import { z } from "zod";

const ownerEnum = z.enum(["Admin", "Partner"]);
const trendEnum = z.enum(["Rising", "Stable"]);

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
    country: z.string().min(1).max(120),
    maxDofollow: z.number().int().min(0).max(100),
    guest: z.number().int().min(0),
    insert: z.number().int().min(0),
    tat: z.string().min(1).max(120),
    owner: ownerEnum,
    trend: trendEnum,
  })
  .strict();

export const updateListingSchema = createListingSchema.partial().strict();

export const listListingsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  filter: z
    .enum(["all", "budget", "authority", "traffic", "India", "General", "highDa"])
    .default("all"),
  sort: z
    .enum(["recommended", "price", "traffic", "dr", "da"])
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
