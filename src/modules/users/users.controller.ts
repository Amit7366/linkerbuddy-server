import type { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service.js";
import { successResponse } from "@/utils/apiResponse.js";
import type { UpdateProfileInput } from "@/modules/orders/orders.validation.js";

export const usersController = {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getMe(req.user!.sub);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.updateMe(
        req.user!.sub,
        req.body as UpdateProfileInput,
      );
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  },
};
