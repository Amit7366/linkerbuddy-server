import { prisma } from "@/lib/prisma.js";
import type { Role } from "@prisma/client";

export const authModel = {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async createUser(data: { email: string; passwordHash: string; name?: string; role?: Role }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name ?? null,
        role: data.role,
      },
    });
  },

  async createRefreshToken(data: { tokenHash: string; userId: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  },

  async findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  },

  async deleteRefreshToken(id: string) {
    return prisma.refreshToken.delete({ where: { id } });
  },

  async deleteRefreshTokensByUserId(userId: string) {
    return prisma.refreshToken.deleteMany({ where: { userId } });
  },

  async findRefreshTokensByUserId(userId: string) {
    return prisma.refreshToken.findMany({
      where: { userId },
      include: { user: true },
    });
  },
};
