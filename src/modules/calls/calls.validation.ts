import { z } from "zod";
import { CallChannel, CallStatus } from "@prisma/client";
import {
  CALL_DURATION_MIN,
  CALL_PURPOSES,
  MONTHLY_BUDGETS,
} from "./calls.constants.js";

export const listSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  timezone: z.string().min(1).default("UTC"),
  duration: z.coerce.number().int().positive().default(CALL_DURATION_MIN),
});

export const createCallSchema = z.object({
  startsAt: z.string().datetime(),
  timezone: z.string().min(1),
  channel: z.nativeEnum(CallChannel),
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.union([z.string().url(), z.literal("")]).optional(),
  monthlyBudget: z.enum(MONTHLY_BUDGETS).optional(),
  purpose: z.enum(CALL_PURPOSES).default("GENERAL"),
  notes: z.string().optional(),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: "Please agree to the privacy policy" }),
  }),
});

export const manageTokenParamSchema = z.object({
  token: z.string().min(8),
});

export const rescheduleCallSchema = z.object({
  startsAt: z.string().datetime(),
  timezone: z.string().min(1).optional(),
});

export const listCallsQuerySchema = z.object({
  status: z.nativeEnum(CallStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const callIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateCallSchema = z.object({
  status: z.nativeEnum(CallStatus).optional(),
  notes: z.string().optional(),
});

export const availabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1).optional(),
});

export const putAvailabilitySchema = z.object({
  rules: z.array(availabilityRuleSchema).min(1),
  blocks: z
    .array(
      z.object({
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
});

export type CreateCallInput = z.infer<typeof createCallSchema>;
export type ListSlotsQuery = z.infer<typeof listSlotsQuerySchema>;
export type ListCallsQuery = z.infer<typeof listCallsQuerySchema>;
export type UpdateCallInput = z.infer<typeof updateCallSchema>;
export type PutAvailabilityInput = z.infer<typeof putAvailabilitySchema>;
export type RescheduleCallInput = z.infer<typeof rescheduleCallSchema>;
