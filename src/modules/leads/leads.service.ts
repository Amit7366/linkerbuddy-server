import { leadsModel } from "./leads.model.js";
import type { CreateLeadInput } from "./leads.types.js";
import type { LeadStatus } from "@prisma/client";

export const leadsService = {
  async createLead(input: CreateLeadInput) {
    return leadsModel.create(input);
  },

  async listLeads(params: { status?: LeadStatus; page: number; limit: number }) {
    return leadsModel.findMany(params);
  },
};
