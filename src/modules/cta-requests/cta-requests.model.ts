import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.js";
import type { ListCtaRequestsQuery } from "./cta-requests.validation.js";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createWriteToken() {
  const token = randomBytes(24).toString("hex");
  return { token, hash: hashToken(token) };
}

export const ctaRequestsModel = {
  hashToken,

  async create(input: {
    email: string;
    niche: string;
    budget: string;
    writeTokenHash: string;
  }) {
    return prisma.ctaRequest.create({
      data: {
        email: input.email.trim().toLowerCase(),
        niche: input.niche,
        budget: input.budget,
        writeTokenHash: input.writeTokenHash,
        aiStatus: "PENDING",
        status: "NEW",
      },
    });
  },

  async findById(id: string) {
    return prisma.ctaRequest.findUnique({ where: { id } });
  },

  async attachAnalysis(
    id: string,
    data: {
      aiStatus: "READY" | "FAILED";
      summary: string | null;
      strategy: string | null;
      tips: Prisma.InputJsonValue;
      recommendations: Prisma.InputJsonValue;
      aiError: string | null;
    },
  ) {
    return prisma.ctaRequest.update({
      where: { id },
      data: {
        ...data,
        writeTokenHash: null,
      },
    });
  },

  async updateStatus(id: string, status: "NEW" | "CONTACTED" | "CONVERTED") {
    return prisma.ctaRequest.update({
      where: { id },
      data: { status },
    });
  },

  async list(query: ListCtaRequestsQuery) {
    const where: Prisma.CtaRequestWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { niche: { contains: q, mode: "insensitive" } },
        { budget: { contains: q, mode: "insensitive" } },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.ctaRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.ctaRequest.count({ where }),
    ]);

    return { requests, total, page: query.page, limit: query.limit };
  },
};
