import { prisma } from "@/lib/prisma.js";
import type {
  CreateReviewInput,
  ListAdminReviewsQuery,
  UpdateAdminReviewInput,
} from "./reviews.validation.js";

function displayName(user: { name: string | null; email: string }) {
  const name = user.name?.trim();
  if (name) return name;
  return user.email.split("@")[0] || "Customer";
}

const adminInclude = {
  user: { select: { id: true, name: true, email: true } },
  order: { select: { orderNumber: true } },
} as const;

export const reviewsModel = {
  displayName,

  async findPublic(limit: number) {
    return prisma.review.findMany({
      where: { showOnHome: true },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
      },
    });
  },

  async findByUser(userId: string) {
    return prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { orderNumber: true } },
      },
    });
  },

  async findPendingOrders(userId: string) {
    return prisma.order.findMany({
      where: {
        userId,
        status: "COMPLETE",
        review: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        totalCents: true,
        currency: true,
        createdAt: true,
      },
    });
  },

  async findOrderForReview(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { review: { select: { id: true } } },
    });
  },

  async create(userId: string, input: CreateReviewInput) {
    return prisma.review.create({
      data: {
        orderId: input.orderId,
        userId,
        rating: input.rating,
        description: input.description,
        showOnHome: true,
      },
      include: {
        order: { select: { orderNumber: true } },
      },
    });
  },

  async findAdmin(params: ListAdminReviewsQuery) {
    const skip = (params.page - 1) * params.limit;
    const q = params.q?.trim();
    const where = q
      ? {
          OR: [
            { description: { contains: q, mode: "insensitive" as const } },
            { order: { orderNumber: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
        include: adminInclude,
      }),
      prisma.review.count({ where }),
    ]);

    return { reviews, total, page: params.page, limit: params.limit };
  },

  async findById(id: string) {
    return prisma.review.findUnique({
      where: { id },
      include: adminInclude,
    });
  },

  async updateAdmin(id: string, data: UpdateAdminReviewInput) {
    return prisma.review.update({
      where: { id },
      data: {
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.showOnHome !== undefined ? { showOnHome: data.showOnHome } : {}),
      },
      include: adminInclude,
    });
  },

  async delete(id: string) {
    return prisma.review.delete({ where: { id } });
  },

  async countByUser(userId: string) {
    return prisma.review.count({ where: { userId } });
  },
};
