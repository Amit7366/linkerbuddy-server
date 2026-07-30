import type { LeadStatus } from "@prisma/client";

export interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
  userId?: string;
}

export interface LeadResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  createdAt: Date;
}
