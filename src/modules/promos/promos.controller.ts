import type { Request, Response, NextFunction } from "express";
import { successResponse } from "@/utils/apiResponse.js";
import { promosService } from "./promos.service.js";
import type {
  CreatePromoInput,
  ListPromosQuery,
  UpdatePromoInput,
} from "./promos.validation.js";

export const promosController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await promosService.list(req.query as unknown as ListPromosQuery);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promo = await promosService.create(req.body as CreatePromoInput);
      res.status(201).json(successResponse(promo));
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promo = await promosService.update(
        req.params.id as string,
        req.body as UpdatePromoInput,
      );
      res.json(successResponse(promo));
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await promosService.remove(req.params.id as string);
      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },
};
