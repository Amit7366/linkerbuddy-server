import { z } from "zod";
import { CTA_BUDGETS, CTA_NICHES } from "./cta-requests.types.js";

export const createCtaRequestSchema = z.object({
  email: z.string().email().max(160),
  niche: z.enum(CTA_NICHES),
  budget: z.enum(CTA_BUDGETS),
});

export const ctaRequestIdParamSchema = z.object({
  id: z.string().min(1),
});

const recommendationSchema = z.object({
  siteId: z.number().int(),
  domain: z.string().min(1).max(200),
  niche: z.string().max(80).optional().default(""),
  da: z.number().int().optional().default(0),
  dr: z.number().int().optional().default(0),
  traffic: z.number().int().optional().default(0),
  country: z.string().max(80).optional().default(""),
  guest: z.number().int().optional().default(0),
  tat: z.string().max(40).optional().default(""),
  owner: z.string().max(40).optional().default(""),
  trend: z.string().max(40).optional().default(""),
  fitScore: z.number().int().min(1).max(100),
  reason: z.string().max(280),
});

export const attachCtaAnalysisSchema = z.object({
  writeToken: z.string().min(16).max(128),
  summary: z.string().max(400).optional().default(""),
  strategy: z.string().max(360).optional().default(""),
  tips: z.array(z.string().max(200)).max(6).optional().default([]),
  recommendations: z.array(recommendationSchema).max(8).optional().default([]),
  failed: z.boolean().optional().default(false),
  aiError: z.string().max(400).optional().nullable(),
});

export const listCtaRequestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().optional(),
  status: z.enum(["NEW", "CONTACTED", "CONVERTED"]).optional(),
});

export const updateCtaRequestSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CONVERTED"]),
});

export type CreateCtaRequestInput = z.infer<typeof createCtaRequestSchema>;
export type AttachCtaAnalysisInput = z.infer<typeof attachCtaAnalysisSchema>;
export type ListCtaRequestsQuery = z.infer<typeof listCtaRequestsQuerySchema>;
export type UpdateCtaRequestInput = z.infer<typeof updateCtaRequestSchema>;
