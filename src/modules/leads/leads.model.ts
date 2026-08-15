import { prisma } from "@/lib/prisma.js";
import type { LeadStatus, Prisma } from "@prisma/client";
import type { CreateLeadInput } from "./leads.types.js";
import { isHighValueLead } from "@/modules/calls/calls.constants.js";

const leadInclude = {
  replies: {
    orderBy: { createdAt: "asc" as const },
    include: {
      sentBy: { select: { id: true, name: true, email: true } },
    },
  },
  scheduledCalls: {
    orderBy: { startsAt: "desc" as const },
  },
};

export const leadsModel = {
  async create(data: CreateLeadInput) {
    const website = data.website?.trim() ? data.website.trim() : null;
    return prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        subject: data.subject ?? null,
        message: data.message ?? null,
        company: data.company ?? null,
        website,
        monthlyBudget: data.monthlyBudget ?? null,
        purpose: data.purpose ?? null,
        highValue: isHighValueLead(data.purpose, data.monthlyBudget),
        privacyAcceptedAt: data.privacyAccepted ? new Date() : null,
        source: data.source ?? "contact_form",
        userId: data.userId ?? null,
      },
    });
  },

  async findMany(params: {
    status?: LeadStatus;
    source?: string;
    q?: string;
    page: number;
    limit: number;
  }) {
    const skip = (params.page - 1) * params.limit;
    const where: Prisma.LeadWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.source) where.source = params.source;
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: "insensitive" } },
        { email: { contains: params.q, mode: "insensitive" } },
        { subject: { contains: params.q, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { replies: true, scheduledCalls: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return { leads, total, page: params.page, limit: params.limit };
  },

  async findById(id: string) {
    return prisma.lead.findUnique({
      where: { id },
      include: leadInclude,
    });
  },

  async updateStatus(id: string, status: LeadStatus) {
    return prisma.lead.update({ where: { id }, data: { status } });
  },

  async createReply(input: {
    leadId: string;
    subject: string;
    body: string;
    sentById?: string;
  }) {
    const [reply] = await prisma.$transaction([
      prisma.leadReply.create({
        data: {
          leadId: input.leadId,
          subject: input.subject,
          body: input.body,
          sentById: input.sentById ?? null,
        },
        include: {
          sentBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.lead.update({
        where: { id: input.leadId },
        data: { status: "CONTACTED" },
      }),
    ]);
    return reply;
  },
};
