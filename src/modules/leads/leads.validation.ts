import { z } from "zod";
import { LeadStatus } from "@prisma/client";
import { CALL_PURPOSES, MONTHLY_BUDGETS } from "@/modules/calls/calls.constants.js";

export const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(1, "Subject is required").optional(),
  message: z.string().optional(),
  company: z.string().optional(),
  website: z.union([z.string().url(), z.literal("")]).optional(),
  monthlyBudget: z.enum(MONTHLY_BUDGETS).optional(),
  purpose: z.enum(CALL_PURPOSES).optional(),
  privacyAccepted: z.boolean().optional(),
  source: z.string().default("contact_form"),
});

export const listLeadsQuerySchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const leadIdParamSchema = z.object({
  id: z.string().min(1),
});

export const replyLeadSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Reply body is required"),
});

export const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type ReplyLeadInput = z.infer<typeof replyLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
