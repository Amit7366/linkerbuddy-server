import type { Request, Response, NextFunction } from "express";
import { successResponse } from "@/utils/apiResponse.js";
import { dashboardService } from "./dashboard.service.js";

export const dashboardController = {
  async getOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await dashboardService.getOverview();
      res.json(successResponse(overview));
    } catch (error) {
      next(error);
    }
  },
};
