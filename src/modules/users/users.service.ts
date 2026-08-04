import { usersModel } from "./users.model.js";
import { AppError } from "@/utils/appError.js";
import type { UpdateProfileInput } from "@/modules/orders/orders.validation.js";

export const usersService = {
  async getMe(userId: string) {
    const user = await usersModel.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    return user;
  },

  async updateMe(userId: string, input: UpdateProfileInput) {
    const user = await usersModel.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    return usersModel.updateProfile(userId, input);
  },
};
