import { leadsModel } from "./leads.model.js";
import type { CreateLeadInput } from "./leads.types.js";
import type { LeadStatus } from "@prisma/client";
import { AppError } from "@/utils/appError.js";
import { env } from "@/config/env.js";
import {
  contactClientEmail,
  contactInternalEmail,
  replyClientEmail,
  replyInternalEmail,
} from "@/lib/email-templates.js";
import { sendClientAndBusinessEmails, sendMail, sendQuietMail } from "@/lib/mailer.js";
import { PURPOSE_LABELS, BUDGET_LABELS } from "@/modules/calls/calls.constants.js";

function labeledInquiry(lead: {
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string | null;
  company: string | null;
  website: string | null;
  monthlyBudget: string | null;
  purpose: string | null;
  highValue: boolean;
}) {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    subject: lead.subject,
    message: lead.message,
    company: lead.company,
    website: lead.website,
    monthlyBudget: lead.monthlyBudget ? BUDGET_LABELS[lead.monthlyBudget] ?? lead.monthlyBudget : lead.monthlyBudget,
    purpose: lead.purpose ? PURPOSE_LABELS[lead.purpose] ?? lead.purpose : lead.purpose,
    highValue: lead.highValue,
  };
}

export const leadsService = {
  async createLead(input: CreateLeadInput) {
    if (input.source !== "schedule_call" && !input.privacyAccepted) {
      throw new AppError("Please agree to the privacy policy", 400, "PRIVACY_REQUIRED");
    }

    const lead = await leadsModel.create(input);
    const fields = labeledInquiry(lead);
    const crmPath = `/crm/leads/${lead.id}`;

    void sendClientAndBusinessEmails({
      clientEmail: lead.email,
      client: contactClientEmail(fields),
      business: contactInternalEmail({ ...fields, crmPath }),
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
    const client = replyClientEmail({
      name: lead.name,
      subject: input.subject,
      body: input.body,
    });
    const business = replyInternalEmail({
      name: lead.name,
      email: lead.email,
      subject: input.subject,
      body: input.body,
      crmPath: `/crm/leads/${lead.id}`,
    });

    await sendMail({
      to: lead.email,
      subject: client.subject,
      text: client.text,
      html: client.html,
      replyTo: env.NOTIFY_EMAIL,
    });

    void sendQuietMail({
      to: env.NOTIFY_EMAIL,
      subject: business.subject,
      text: business.text,
      html: business.html,
      replyTo: lead.email,
    });

    return leadsModel.createReply({
      leadId: id,
      subject: input.subject,
      body: input.body,
      sentById,
    });
  },
};
