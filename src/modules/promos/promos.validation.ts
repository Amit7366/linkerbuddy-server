import { z } from "zod";

export const promoDiscountTypeSchema = z.enum(["PERCENT", "FIXED"]);

const optionalDate = z.string().min(1).optional().nullable();

export const promoFieldsSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphen, or underscore"),
  description: z.string().max(240).optional().nullable(),
  type: promoDiscountTypeSchema,
  value: z.coerce.number().int().positive(),
  minOrderCents: z.coerce.number().int().min(0).default(0),
  maxDiscountCents: z.coerce.number().int().positive().optional().nullable(),
  maxUses: z.coerce.number().int().positive().optional().nullable(),
  startsAt: optionalDate,
  endsAt: optionalDate,
  active: z.boolean().optional().default(true),
});

function refinePercentValue(
  data: { type?: "PERCENT" | "FIXED"; value?: number },
  ctx: z.RefinementCtx,
) {
  if (data.type === "PERCENT" && data.value != null && data.value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Percent discount cannot exceed 100",
    });
  }
}

export const createPromoSchema = promoFieldsSchema.superRefine(refinePercentValue);

export const updatePromoSchema = promoFieldsSchema.partial().superRefine(refinePercentValue);

export const listPromosQuerySchema = z.object({
  q: z.string().optional(),
  active: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const promoIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreatePromoInput = z.infer<typeof createPromoSchema>;
export type UpdatePromoInput = z.infer<typeof updatePromoSchema>;
export type ListPromosQuery = z.infer<typeof listPromosQuerySchema>;
