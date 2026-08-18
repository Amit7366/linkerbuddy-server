import type { CtaRequest } from "@prisma/client";
import { AppError } from "@/utils/appError.js";
import { ctaRequestsModel, createWriteToken } from "./cta-requests.model.js";
import type {
  AttachCtaAnalysisInput,
  CreateCtaRequestInput,
  ListCtaRequestsQuery,
  UpdateCtaRequestInput,
} from "./cta-requests.validation.js";
import type {
  CtaRecommendationSnapshot,
  CtaRequestAdmin,
  CtaRequestPublicCreate,
} from "./cta-requests.types.js";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asRecommendations(value: unknown): CtaRecommendationSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.siteId !== "number" || typeof row.domain !== "string") return [];
    return [
      {
        siteId: row.siteId,
        domain: row.domain,
        niche: typeof row.niche === "string" ? row.niche : "",
        da: typeof row.da === "number" ? row.da : 0,
        dr: typeof row.dr === "number" ? row.dr : 0,
        traffic: typeof row.traffic === "number" ? row.traffic : 0,
        country: typeof row.country === "string" ? row.country : "",
        guest: typeof row.guest === "number" ? row.guest : 0,
        tat: typeof row.tat === "string" ? row.tat : "",
        owner: typeof row.owner === "string" ? row.owner : "",
        trend: typeof row.trend === "string" ? row.trend : "",
        fitScore: typeof row.fitScore === "number" ? row.fitScore : 0,
        reason: typeof row.reason === "string" ? row.reason : "",
      },
    ];
  });
}

function toAdmin(row: CtaRequest): CtaRequestAdmin {
  const recommendations = asRecommendations(row.recommendations);
  return {
    id: row.id,
    email: row.email,
    niche: row.niche,
    budget: row.budget,
    status: row.status,
    aiStatus: row.aiStatus,
    summary: row.summary,
    strategy: row.strategy,
    tips: asStringArray(row.tips),
    recommendations,
    aiError: row.aiError,
    pickCount: recommendations.length,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const ctaRequestsService = {
  async create(input: CreateCtaRequestInput): Promise<CtaRequestPublicCreate> {
    const { token, hash } = createWriteToken();
    const row = await ctaRequestsModel.create({
      email: input.email,
      niche: input.niche,
      budget: input.budget,
      writeTokenHash: hash,
    });
    return { id: row.id, writeToken: token };
  },

  async attachAnalysis(id: string, input: AttachCtaAnalysisInput) {
    const row = await ctaRequestsModel.findById(id);
    if (!row) {
      throw new AppError("Shortlist request not found", 404, "NOT_FOUND");
    }
    if (!row.writeTokenHash || row.aiStatus !== "PENDING") {
      throw new AppError("This shortlist request can no longer be updated", 409, "ALREADY_ATTACHED");
    }
    if (ctaRequestsModel.hashToken(input.writeToken) !== row.writeTokenHash) {
      throw new AppError("Invalid write token", 403, "FORBIDDEN");
    }

    const failed = input.failed || Boolean(input.aiError);
    const updated = await ctaRequestsModel.attachAnalysis(id, {
      aiStatus: failed ? "FAILED" : "READY",
      summary: input.summary || null,
      strategy: input.strategy || null,
      tips: input.tips,
      recommendations: input.recommendations,
      aiError: input.aiError ?? null,
    });
    return toAdmin(updated);
  },

  async listAdmin(query: ListCtaRequestsQuery) {
    const result = await ctaRequestsModel.list(query);
    return {
      requests: result.requests.map(toAdmin),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  },

  async getAdmin(id: string) {
    const row = await ctaRequestsModel.findById(id);
    if (!row) {
      throw new AppError("Shortlist request not found", 404, "NOT_FOUND");
    }
    return toAdmin(row);
  },

  async updateStatus(id: string, input: UpdateCtaRequestInput) {
    await this.getAdmin(id);
    const updated = await ctaRequestsModel.updateStatus(id, input.status);
    return toAdmin(updated);
  },
};
