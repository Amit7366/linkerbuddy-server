import { prisma } from "@/lib/prisma.js";
import type { UpdateProfileInput } from "@/modules/orders/orders.validation.js";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  company: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const usersModel = {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
  },

  async updateProfile(id: string, data: UpdateProfileInput) {
    return prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.company !== undefined ? { company: data.company } : {}),
        ...(data.addressLine1 !== undefined ? { addressLine1: data.addressLine1 } : {}),
        ...(data.addressLine2 !== undefined ? { addressLine2: data.addressLine2 } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.state !== undefined ? { state: data.state } : {}),
        ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
      },
      select: userSelect,
    });
  },
};
