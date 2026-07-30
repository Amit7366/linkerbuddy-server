import type { Request, Response, NextFunction } from "express";
import { leadsService } from "./leads.service.js";
import { successResponse } from "@/utils/apiResponse.js";
import type { CreateLeadInput } from "./leads.types.js";
import type { LeadStatus } from "@prisma/client";

export const leadsController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: CreateLeadInput = {
        ...req.body,
        userId: req.user?.sub,
      };
      const lead = await leadsService.createLead(input);
      res.status(201).json(successResponse(lead));
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as {
        status?: LeadStatus;
        page: number;
        limit: number;
      };
      const result = await leadsService.listLeads(query);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },
};
