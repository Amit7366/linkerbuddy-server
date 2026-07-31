import { Prisma } from "@prisma/client";
import { AppError } from "@/utils/appError.js";
import { marketplaceModel } from "./marketplace.model.js";
import type {
  CreateListingInput,
  ListListingsQuery,
  UpdateListingInput,
} from "./marketplace.validation.js";

export const marketplaceService = {
  async list(query: ListListingsQuery) {
    return marketplaceModel.findMany(query);
  },

  async getStats() {
    return marketplaceModel.getStats();
  },

  async getById(id: number) {
    const listing = await marketplaceModel.findById(id);
    if (!listing) {
      throw new AppError("Listing not found", 404, "NOT_FOUND");
    }
    return listing;
  },

  async create(input: CreateListingInput) {
    const existing = await marketplaceModel.findByDomain(input.domain.toLowerCase());
    if (existing) {
      throw new AppError("Domain already exists", 409, "DOMAIN_EXISTS");
    }
    return marketplaceModel.create(input);
  },

  async update(id: number, input: UpdateListingInput) {
    const existing = await marketplaceModel.findById(id);
    if (!existing) {
      throw new AppError("Listing not found", 404, "NOT_FOUND");
    }

    if (input.domain) {
      const domainOwner = await marketplaceModel.findByDomain(input.domain.toLowerCase());
      if (domainOwner && domainOwner.id !== id) {
        throw new AppError("Domain already exists", 409, "DOMAIN_EXISTS");
      }
    }

    try {
      return await marketplaceModel.update(id, input);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Listing not found", 404, "NOT_FOUND");
      }
      throw error;
    }
  },

  async remove(id: number) {
    const existing = await marketplaceModel.findById(id);
    if (!existing) {
      throw new AppError("Listing not found", 404, "NOT_FOUND");
    }
    try {
      await marketplaceModel.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Listing not found", 404, "NOT_FOUND");
      }
      throw error;
    }
    return { message: "Listing deleted" };
  },
};
