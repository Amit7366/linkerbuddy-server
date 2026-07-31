import type { Request, Response, NextFunction } from "express";
import { marketplaceService } from "./marketplace.service.js";
import { successResponse } from "@/utils/apiResponse.js";
import type { ListListingsQuery } from "./marketplace.validation.js";

export const marketplaceController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListListingsQuery;
      const result = await marketplaceService.list(query);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const listing = await marketplaceService.getById(id);
      res.json(successResponse(listing));
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const listing = await marketplaceService.create(req.body);
      res.status(201).json(successResponse(listing));
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const listing = await marketplaceService.update(id, req.body);
      res.json(successResponse(listing));
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const result = await marketplaceService.remove(id);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },
};
