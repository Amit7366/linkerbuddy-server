import type { LeadStatus } from "@prisma/client";

export interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message?: string;
  company?: string;
  website?: string;
  monthlyBudget?: string;
  purpose?: string;
  privacyAccepted?: boolean;
  source?: string;
  userId?: string;
}

export interface LeadResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  highValue: boolean;
  createdAt: Date;
}
