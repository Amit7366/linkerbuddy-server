import { prisma } from "@/lib/prisma.js";
import type { CallStatus, Prisma } from "@prisma/client";
import { STAFF_TIMEZONE } from "./calls.constants.js";

const callInclude = {
  lead: true,
} satisfies Prisma.ScheduledCallInclude;

export const callsModel = {
  async findScheduledOverlapping(startsAt: Date, endsAt: Date, excludeId?: string) {
    return prisma.scheduledCall.findFirst({
      where: {
        status: "SCHEDULED",
        id: excludeId ? { not: excludeId } : undefined,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
  },

  async findScheduledInRange(startsAt: Date, endsAt: Date) {
    return prisma.scheduledCall.findMany({
      where: {
        status: "SCHEDULED",
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
  },

  async create(data: Prisma.ScheduledCallUncheckedCreateInput) {
    return prisma.scheduledCall.create({
      data,
      include: callInclude,
    });
  },

  async findByToken(token: string) {
    return prisma.scheduledCall.findUnique({
      where: { manageToken: token },
      include: callInclude,
    });
  },

  async findById(id: string) {
    return prisma.scheduledCall.findUnique({
      where: { id },
      include: callInclude,
    });
  },

  async update(id: string, data: Prisma.ScheduledCallUncheckedUpdateInput) {
    return prisma.scheduledCall.update({
      where: { id },
      data,
      include: callInclude,
    });
  },

  async findMany(params: { status?: CallStatus; q?: string; page: number; limit: number }) {
    const skip = (params.page - 1) * params.limit;
    const q = params.q?.trim();
    const where: Prisma.ScheduledCallWhereInput = {};
    if (params.status) where.status = params.status;
    if (q) {
      where.lead = {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      };
    }
    const [calls, total] = await Promise.all([
      prisma.scheduledCall.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { startsAt: "desc" },
        include: callInclude,
      }),
      prisma.scheduledCall.count({ where }),
    ]);
    return { calls, total, page: params.page, limit: params.limit };
  },

  async listRules() {
    return prisma.availabilityRule.findMany({ orderBy: { dayOfWeek: "asc" } });
  },

  async listBlocks() {
    return prisma.availabilityBlock.findMany({ orderBy: { startsAt: "asc" } });
  },

  async replaceAvailability(
    rules: Array<{ dayOfWeek: number; startTime: string; endTime: string; timezone?: string }>,
    blocks?: Array<{ startsAt: Date; endsAt: Date; reason?: string }>,
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany();
      await tx.availabilityRule.createMany({
        data: rules.map((rule) => ({
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          timezone: rule.timezone ?? STAFF_TIMEZONE,
        })),
      });
      if (blocks) {
        await tx.availabilityBlock.deleteMany();
        if (blocks.length > 0) {
          await tx.availabilityBlock.createMany({
            data: blocks.map((block) => ({
              startsAt: block.startsAt,
              endsAt: block.endsAt,
              reason: block.reason ?? null,
            })),
          });
        }
      }
    });
    return this.getAvailability();
  },

  async getAvailability() {
    const [rules, blocks] = await Promise.all([this.listRules(), this.listBlocks()]);
    return { rules, blocks };
  },
};
