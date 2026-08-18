import type { Request, Response, NextFunction } from "express";
import { successResponse } from "@/utils/apiResponse.js";
import { ctaRequestsService } from "./cta-requests.service.js";
import type {
  AttachCtaAnalysisInput,
  CreateCtaRequestInput,
  ListCtaRequestsQuery,
  UpdateCtaRequestInput,
} from "./cta-requests.validation.js";

export const ctaRequestsController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ctaRequestsService.create(req.body as CreateCtaRequestInput);
      res.status(201).json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async attachAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const data = await ctaRequestsService.attachAnalysis(
        id,
        req.body as AttachCtaAnalysisInput,
      );
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async listAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ctaRequestsService.listAdmin(
        req.query as unknown as ListCtaRequestsQuery,
      );
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async getAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const data = await ctaRequestsService.getAdmin(id);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const data = await ctaRequestsService.updateStatus(
        id,
        req.body as UpdateCtaRequestInput,
      );
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },
};
