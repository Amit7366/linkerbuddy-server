import { z } from "zod";

export const serviceTypeSchema = z.enum(["GUEST", "INSERT"]);

export const billingSchema = z.object({
  billingName: z.string().min(1, "Name is required").max(120),
  billingEmail: z.string().email("Valid email is required"),
  billingPhone: z.string().min(5, "Phone is required").max(40),
  billingCompany: z.string().max(120).optional().nullable(),
  addressLine1: z.string().min(1, "Address is required").max(200),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  postalCode: z.string().min(1, "Postal code is required").max(30),
  country: z.string().min(2, "Country is required").max(100),
  notes: z.string().max(2000).optional().nullable(),
});

export const checkoutItemSchema = z.object({
  listingId: z.coerce.number().int().positive(),
  serviceType: serviceTypeSchema,
  quantity: z.coerce.number().int().min(1).max(99),
});

export const checkoutIntentSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "Cart is empty"),
  billing: billingSchema,
  saveBillingToProfile: z.boolean().optional().default(true),
});

export const listOrdersQuerySchema = z.object({
  q: z.string().optional(),
  status: z
    .enum([
      "PENDING",
      "ACCEPTED",
      "PROCESSING",
      "SHIPPING",
      "DELIVERING",
      "COMPLETE",
      "FAILED",
      "REJECTED",
      "CANCELLED",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const orderIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "ACCEPTED",
    "PROCESSING",
    "SHIPPING",
    "DELIVERING",
    "COMPLETE",
    "FAILED",
    "REJECTED",
    "CANCELLED",
  ]),
  note: z.string().max(500).optional().nullable(),
});

export const updateOrderItemSchema = z.object({
  id: z.string().optional(),
  listingId: z.coerce.number().int().positive(),
  serviceType: serviceTypeSchema,
  quantity: z.coerce.number().int().min(1).max(99),
  unitPriceCents: z.coerce.number().int().min(0).optional(),
  domain: z.string().optional(),
  niche: z.string().optional(),
});

export const updateOrderSchema = z.object({
  billingName: z.string().min(1).max(120).optional(),
  billingEmail: z.string().email().optional(),
  billingPhone: z.string().min(5).max(40).optional(),
  billingCompany: z.string().max(120).optional().nullable(),
  addressLine1: z.string().min(1).max(200).optional(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  postalCode: z.string().min(1).max(30).optional(),
  country: z.string().min(2).max(100).optional(),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(updateOrderItemSchema).min(1).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(30).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});

export type CheckoutIntentInput = z.infer<typeof checkoutIntentSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
