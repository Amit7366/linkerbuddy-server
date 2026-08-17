import type { PromoCode } from "@prisma/client";
import { AppError } from "@/utils/appError.js";
import { promosModel } from "./promos.model.js";
import type {
  CreatePromoInput,
  ListPromosQuery,
  UpdatePromoInput,
} from "./promos.validation.js";

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("Invalid date", 400, "INVALID_DATE");
  }
  return date;
}

export function computePromoDiscount(subtotalCents: number, promo: PromoCode) {
  if (subtotalCents < promo.minOrderCents) {
    throw new AppError(
      `This code requires a minimum order of $${(promo.minOrderCents / 100).toFixed(2)}`,
      400,
      "PROMO_MIN_ORDER",
    );
  }

  let discount =
    promo.type === "PERCENT"
      ? Math.round((subtotalCents * promo.value) / 100)
      : promo.value;

  if (promo.maxDiscountCents != null) {
    discount = Math.min(discount, promo.maxDiscountCents);
  }

  return Math.max(0, Math.min(discount, subtotalCents));
}

export function assertPromoUsable(promo: PromoCode, alreadyOnThisOrder: boolean) {
  const now = new Date();
  if (!promo.active) {
    throw new AppError("This promo code is inactive", 400, "PROMO_INACTIVE");
  }
  if (promo.startsAt && promo.startsAt > now) {
    throw new AppError("This promo code is not active yet", 400, "PROMO_NOT_STARTED");
  }
  if (promo.endsAt && promo.endsAt < now) {
    throw new AppError("This promo code has expired", 400, "PROMO_EXPIRED");
  }
  if (
    promo.maxUses != null &&
    !alreadyOnThisOrder &&
    promo.usedCount >= promo.maxUses
  ) {
    throw new AppError("This promo code has reached its usage limit", 400, "PROMO_MAX_USES");
  }
}

export const promosService = {
  list(query: ListPromosQuery) {
    return promosModel.list(query);
  },

  async getById(id: string) {
    const promo = await promosModel.findById(id);
    if (!promo) throw new AppError("Promo code not found", 404, "NOT_FOUND");
    return promo;
  },

  async create(input: CreatePromoInput) {
    const code = normalizeCode(input.code);
    const existing = await promosModel.findByCode(code);
    if (existing) {
      throw new AppError("That promo code already exists", 409, "PROMO_EXISTS");
    }
    return promosModel.create({
      code,
      description: input.description?.trim() || null,
      type: input.type,
      value: input.value,
      minOrderCents: input.minOrderCents,
      maxDiscountCents: input.maxDiscountCents ?? null,
      maxUses: input.maxUses ?? null,
      startsAt: toDate(input.startsAt),
      endsAt: toDate(input.endsAt),
      active: input.active ?? true,
    });
  },

  async update(id: string, input: UpdatePromoInput) {
    const existing = await this.getById(id);
    const nextType = input.type ?? existing.type;
    const nextValue = input.value ?? existing.value;
    if (nextType === "PERCENT" && nextValue > 100) {
      throw new AppError("Percent discount cannot exceed 100", 400, "INVALID_PROMO");
    }
    if (input.code) {
      const code = normalizeCode(input.code);
      const existing = await promosModel.findByCode(code);
      if (existing && existing.id !== id) {
        throw new AppError("That promo code already exists", 409, "PROMO_EXISTS");
      }
    }
    return promosModel.update(id, {
      ...(input.code !== undefined ? { code: normalizeCode(input.code) } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.minOrderCents !== undefined ? { minOrderCents: input.minOrderCents } : {}),
      ...(input.maxDiscountCents !== undefined
        ? { maxDiscountCents: input.maxDiscountCents }
        : {}),
      ...(input.maxUses !== undefined ? { maxUses: input.maxUses } : {}),
      ...(input.startsAt !== undefined ? { startsAt: toDate(input.startsAt) } : {}),
      ...(input.endsAt !== undefined ? { endsAt: toDate(input.endsAt) } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });
  },

  async remove(id: string) {
    await this.getById(id);
    await promosModel.remove(id);
    return { id };
  },
};
