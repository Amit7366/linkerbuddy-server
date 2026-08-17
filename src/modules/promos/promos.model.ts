import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.js";
import type { ListPromosQuery } from "./promos.validation.js";

export const promosModel = {
  async findById(id: string) {
    return prisma.promoCode.findUnique({ where: { id } });
  },

  async findByCode(code: string) {
    return prisma.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  },

  async list(query: ListPromosQuery) {
    const where: Prisma.PromoCodeWhereInput = {};
    if (query.active === "true") where.active = true;
    if (query.active === "false") where.active = false;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [promos, total] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.promoCode.count({ where }),
    ]);

    return { promos, total, page: query.page, limit: query.limit };
  },

  async create(data: Prisma.PromoCodeCreateInput) {
    return prisma.promoCode.create({ data });
  },

  async update(id: string, data: Prisma.PromoCodeUpdateInput) {
    return prisma.promoCode.update({ where: { id }, data });
  },

  async remove(id: string) {
    return prisma.promoCode.delete({ where: { id } });
  },

  async incrementUsed(id: string) {
    return prisma.promoCode.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  },

  async decrementUsed(id: string) {
    const promo = await prisma.promoCode.findUnique({ where: { id } });
    if (!promo || promo.usedCount <= 0) return promo;
    return prisma.promoCode.update({
      where: { id },
      data: { usedCount: { decrement: 1 } },
    });
  },
};
