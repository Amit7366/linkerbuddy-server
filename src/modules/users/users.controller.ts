import type { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service.js";
import { successResponse } from "@/utils/apiResponse.js";

export const usersController = {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getMe(req.user!.sub);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  },
};
