import type { Request, Response, NextFunction } from "express";
import { successResponse } from "@/utils/apiResponse.js";
import { dashboardService } from "./dashboard.service.js";
import type { VisitorRange } from "./dashboard.types.js";

export const dashboardController = {
  async getOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await dashboardService.getOverview();
      res.json(successResponse(overview));
    } catch (error) {
      next(error);
    }
  },

  async getVisitors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { range } = req.query as { range: VisitorRange };
      const report = await dashboardService.getVisitors(range);
      res.json(successResponse(report));
    } catch (error) {
      next(error);
    }
  },

  async getLiveVisitors(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const live = await dashboardService.getLiveVisitors();
      res.json(successResponse(live));
    } catch (error) {
      next(error);
    }
  },
};
