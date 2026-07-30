import { prisma } from "@/lib/prisma.js";
import type { LeadStatus } from "@prisma/client";
import type { CreateLeadInput } from "./leads.types.js";

export const leadsModel = {
  async findByEmail(email: string) {
    return prisma.lead.findFirst({ where: { email } });
  },

  async create(data: CreateLeadInput) {
    return prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message ?? null,
        source: data.source ?? "contact_form",
        userId: data.userId ?? null,
      },
    });
  },

  async findMany(params: { status?: LeadStatus; page: number; limit: number }) {
    const skip = (params.page - 1) * params.limit;
    const where = params.status ? { status: params.status } : {};

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.count({ where }),
    ]);

    return { leads, total, page: params.page, limit: params.limit };
  },
};
