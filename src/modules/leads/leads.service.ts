import { leadsModel } from "./leads.model.js";
import type { CreateLeadInput } from "./leads.types.js";
import type { LeadStatus } from "@prisma/client";
import { AppError } from "@/utils/appError.js";
import { env } from "@/config/env.js";
import { formatLeadNotifyText, sendMail, sendNotifyEmail } from "@/lib/mailer.js";
import { PURPOSE_LABELS, BUDGET_LABELS } from "@/modules/calls/calls.constants.js";

export const leadsService = {
  async createLead(input: CreateLeadInput) {
    if (input.source !== "schedule_call" && !input.privacyAccepted) {
      throw new AppError("Please agree to the privacy policy", 400, "PRIVACY_REQUIRED");
    }

    const lead = await leadsModel.create(input);

    void sendNotifyEmail({
      subject: `[Linkerbuddy] New contact from ${lead.name}`,
      text: formatLeadNotifyText({
        kind: "contact",
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        subject: lead.subject,
        message: lead.message,
        company: lead.company,
        website: lead.website,
        monthlyBudget: lead.monthlyBudget ? BUDGET_LABELS[lead.monthlyBudget] : lead.monthlyBudget,
        purpose: lead.purpose ? PURPOSE_LABELS[lead.purpose] : lead.purpose,
        crmPath: `/crm/leads/${lead.id}`,
      }),
    });

    return lead;
  },

  async listLeads(params: {
    status?: LeadStatus;
    source?: string;
    q?: string;
    page: number;
    limit: number;
  }) {
    return leadsModel.findMany(params);
  },

  async getLead(id: string) {
    const lead = await leadsModel.findById(id);
    if (!lead) {
      throw new AppError("Lead not found", 404, "NOT_FOUND");
    }
    return lead;
  },

  async updateLead(id: string, status: LeadStatus) {
    await this.getLead(id);
    return leadsModel.updateStatus(id, status);
  },

  async replyToLead(id: string, input: { subject: string; body: string }, sentById?: string) {
    const lead = await this.getLead(id);
    await sendMail({
      to: lead.email,
      subject: input.subject,
      text: input.body,
      replyTo: env.SMTP_USER || undefined,
    });
    return leadsModel.createReply({
      leadId: id,
      subject: input.subject,
      body: input.body,
      sentById,
    });
  },
};
