import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.js";
import type {
  CreateListingInput,
  ListListingsQuery,
  UpdateListingInput,
} from "./marketplace.validation.js";
import type { MarketplaceListingResponse } from "./marketplace.types.js";

function toResponse(row: {
  id: number;
  domain: string;
  niche: string;
  da: number;
  dr: number;
  traffic: number;
  country: string;
  maxDofollow: number;
  guest: number;
  insert: number;
  tat: string;
  owner: string;
  trend: string;
  createdAt?: Date;
  updatedAt?: Date;
}): MarketplaceListingResponse {
  return {
    id: row.id,
    domain: row.domain,
    niche: row.niche,
    da: row.da,
    dr: row.dr,
    traffic: row.traffic,
    country: row.country,
    maxDofollow: row.maxDofollow,
    guest: row.guest,
    insert: row.insert,
    tat: row.tat,
    owner: row.owner as "Admin" | "Partner",
    trend: row.trend as "Rising" | "Stable",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildWhere(query: ListListingsQuery): Prisma.MarketplaceListingWhereInput {
  const where: Prisma.MarketplaceListingWhereInput = {};
  const and: Prisma.MarketplaceListingWhereInput[] = [];

  if (query.ids) {
    const ids = query.ids
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length > 0) {
      and.push({ id: { in: ids } });
    }
  }

  if (query.q?.trim()) {
    const q = query.q.trim();
    and.push({
      OR: [
        { domain: { contains: q, mode: "insensitive" } },
        { niche: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  switch (query.filter) {
    case "budget":
      and.push({ guest: { lt: 50 } });
      break;
    case "authority":
      and.push({ dr: { gte: 40, lte: 60 } });
      break;
    case "traffic":
      and.push({ traffic: { gte: 10000 } });
      break;
    case "India":
      and.push({ country: "India" });
      break;
    case "General":
      and.push({ niche: "General" });
      break;
    case "highDa":
      and.push({ da: { gte: 50 } });
      break;
    default:
      break;
  }

  if (and.length > 0) where.AND = and;
  return where;
}

function buildOrderBy(
  sort: ListListingsQuery["sort"],
): Prisma.MarketplaceListingOrderByWithRelationInput[] {
  switch (sort) {
    case "price":
      return [{ guest: "asc" }, { id: "asc" }];
    case "traffic":
      return [{ traffic: "desc" }, { id: "asc" }];
    case "dr":
      return [{ dr: "desc" }, { id: "asc" }];
    case "da":
      return [{ da: "desc" }, { id: "asc" }];
    default:
      return [{ id: "asc" }];
  }
}

export const marketplaceModel = {
  async findMany(query: ListListingsQuery) {
    const where = buildWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: buildOrderBy(query.sort),
      }),
      prisma.marketplaceListing.count({ where }),
    ]);

    return {
      listings: rows.map(toResponse),
      total,
      page: query.page,
      limit: query.limit,
    };
  },

  async findById(id: number) {
    const row = await prisma.marketplaceListing.findUnique({ where: { id } });
    return row ? toResponse(row) : null;
  },

  async findByDomain(domain: string) {
    return prisma.marketplaceListing.findUnique({ where: { domain } });
  },

  async create(data: CreateListingInput) {
    const row = await prisma.marketplaceListing.create({
      data: {
        domain: data.domain.toLowerCase(),
        niche: data.niche,
        da: data.da,
        dr: data.dr,
        traffic: data.traffic,
        country: data.country,
        maxDofollow: data.maxDofollow,
        guest: data.guest,
        insert: data.insert,
        tat: data.tat,
        owner: data.owner,
        trend: data.trend,
      },
    });
    return toResponse(row);
  },

  async update(id: number, data: UpdateListingInput) {
    const row = await prisma.marketplaceListing.update({
      where: { id },
      data: {
        ...data,
        ...(data.domain ? { domain: data.domain.toLowerCase() } : {}),
      },
    });
    return toResponse(row);
  },

  async delete(id: number) {
    await prisma.marketplaceListing.delete({ where: { id } });
  },
};
