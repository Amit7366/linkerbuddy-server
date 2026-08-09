import type { Request, Response, NextFunction } from "express";
import { reviewsService } from "./reviews.service.js";
import { successResponse } from "@/utils/apiResponse.js";
import type {
  CreateReviewInput,
  ListAdminReviewsQuery,
  ListPublicReviewsQuery,
  UpdateAdminReviewInput,
} from "./reviews.validation.js";

export const reviewsController = {
  async listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListPublicReviewsQuery;
      const result = await reviewsService.listPublic(query);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reviewsService.listMine(req.user!.sub);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateReviewInput;
      const review = await reviewsService.create(req.user!.sub, input);
      res.status(201).json(successResponse(review));
    } catch (error) {
      next(error);
    }
  },

  async listAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListAdminReviewsQuery;
      const result = await reviewsService.listAdmin(query);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async updateAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const input = req.body as UpdateAdminReviewInput;
      const review = await reviewsService.updateAdmin(id, input);
      res.json(successResponse(review));
    } catch (error) {
      next(error);
    }
  },

  async deleteAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const result = await reviewsService.deleteAdmin(id);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },
};
