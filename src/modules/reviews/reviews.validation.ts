import { z } from "zod";

export const createReviewSchema = z.object({
  orderId: z.string().min(1, "Order is required"),
  rating: z.coerce.number().int().min(1).max(5),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(1000, "Description must be at most 1000 characters"),
});

export const listPublicReviewsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(8),
});

export const listAdminReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().optional(),
});

export const reviewIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateAdminReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    description: z
      .string()
      .trim()
      .min(20, "Description must be at least 20 characters")
      .max(1000, "Description must be at most 1000 characters")
      .optional(),
    showOnHome: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.rating !== undefined ||
      data.description !== undefined ||
      data.showOnHome !== undefined,
    { message: "At least one field is required" },
  );

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ListPublicReviewsQuery = z.infer<typeof listPublicReviewsQuerySchema>;
export type ListAdminReviewsQuery = z.infer<typeof listAdminReviewsQuerySchema>;
export type UpdateAdminReviewInput = z.infer<typeof updateAdminReviewSchema>;
